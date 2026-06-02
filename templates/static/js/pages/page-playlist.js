;(() => {
  if (!document.body.classList.contains('page-playlist')) return;
  if (document.body.classList.contains('page-mix')) return;
const params = new URLSearchParams(location.search);
const playlistId = params.get('list') || '';
let currentPage = parseInt(params.get('page') || '1', 10);
let totalVideos = 0;
let videosPerPage = 100;


if (!playlistId) {
  document.querySelector('main').innerHTML =
    `<div class="pl-error"><div class="error-icon">⚠️</div><p>プレイリストIDが指定されていません。</p></div>`;
}

async function loadPlaylist(page) {
  const skeleton = document.getElementById('playlistSkeleton');
  const mainEl = document.getElementById('playlistMain');

  skeleton.hidden = false;
  mainEl.hidden = true;

  try {
    const data = await fetchMain(`/api/playlists/${encodeURIComponent(playlistId)}?page=${page}`);
    renderPlaylist(data, page);
    mainEl.hidden = false;
    skeleton.hidden = true;
  } catch (e) {
    skeleton.hidden = true;
    document.querySelector('main').innerHTML =
      `<div class="pl-error"><div class="error-icon">⚠️</div><p>プレイリストの取得に失敗しました。</p><p style="font-size:0.8rem;margin-top:0.5rem;">${escapeHtml(e.message)}</p></div>`;
    console.error(e);
  }
}

function renderPlaylist(data, page) {
  totalVideos = data.videoCount || 0;
  videosPerPage = data.videos ? data.videos.length : 100;
  const videos = data.videos || [];

  document.title = `${data.title || '再生リスト'} — Choco-tube-plus`;

  renderHeader(data);
  renderGrid(videos, data);
  renderPagination(page, totalVideos);
}

function renderHeader(data) {
  const headerEl = document.getElementById('playlistHeader');

  const thumb = data.playlistThumbnail
    ? wsrv(data.playlistThumbnail, 560)
    : (data.videos && data.videos[0]?.videoId ? getThumbnailUrl(data.videos[0].videoId) : '');

  const channelUrl = data.authorId ? `/channel?id=${encodeURIComponent(data.authorId)}` : null;
  const channelIcon = data.authorThumbnails ? wsrv(data.authorThumbnails.find(t => t.width >= 32)?.url || data.authorThumbnails[0]?.url, 56) : '';

  const desc = data.description || '';
  const hasMoreDesc = desc.length > 150 || desc.split('\n').length > 3;

  headerEl.innerHTML = `
    <div class="pl-cover">
      ${thumb ? `<img src="${thumb}" alt="${escapeHtml(data.title || '')}" onload="this.classList.add('loaded')" />` : ''}
      ${data.videoCount != null ? `
        <div class="pl-cover-count">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          ${data.videoCount}本の動画
        </div>
      ` : ''}
    </div>
    <div class="pl-meta">
      <div class="pl-title">${escapeHtml(data.title || '再生リスト')}</div>
      ${channelUrl ? `
        <a class="pl-channel-link" href="${channelUrl}">
          ${channelIcon ? `<img class="pl-channel-avatar" src="${channelIcon}" alt="" onload="this.classList.add('loaded')" />` : ''}
          ${escapeHtml(data.author || '')}
        </a>
      ` : data.author ? `<span style="font-size:0.9rem;color:var(--muted);">${escapeHtml(data.author)}</span>` : ''}
      <div class="pl-stats">
        ${data.videoCount != null ? `<span>${data.videoCount}本の動画</span>` : ''}
        ${data.viewCount != null ? `<span>${Number(data.viewCount).toLocaleString()}回視聴</span>` : ''}
        ${data.updated ? `<span>更新日 ${formatUpdated(data.updated)}</span>` : ''}
      </div>
      ${desc ? `
        <div class="pl-description" id="plDesc">${escapeHtml(desc)}</div>
        ${hasMoreDesc ? `<button class="pl-desc-toggle" id="plDescToggle">もっと見る</button>` : ''}
      ` : ''}
      <a class="pl-ext-link" href="https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}" target="_blank" rel="noopener noreferrer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        YouTubeで開く
      </a>
      <button class="pl-fav-btn${isFavoritePlaylist(playlistId) ? ' active' : ''}" id="plFavBtn" title="お気に入りに追加">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isFavoritePlaylist(playlistId) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span id="plFavBtnLabel">${isFavoritePlaylist(playlistId) ? 'お気に入り済み' : 'お気に入り'}</span>
      </button>
    </div>
  `;

  const toggleBtn = headerEl.querySelector('#plDescToggle');
  if (toggleBtn) {
    const descEl = headerEl.querySelector('#plDesc');
    toggleBtn.addEventListener('click', () => {
      const expanded = descEl.classList.toggle('expanded');
      toggleBtn.textContent = expanded ? '閉じる' : 'もっと見る';
    });
  }

  const favBtn = headerEl.querySelector('#plFavBtn');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      const thumb = data.playlistThumbnail ||
        (data.videos && data.videos[0]?.videoId ? getThumbnailUrl(data.videos[0].videoId) : '');
      const plData = {
        playlistId,
        title: data.title || '',
        thumbnail: thumb,
        videoCount: data.videoCount ?? null,
        author: data.author || ''
      };
      const added = toggleFavoritePlaylist(plData);
      const svg = favBtn.querySelector('svg');
      const label = favBtn.querySelector('#plFavBtnLabel');
      if (added) {
        favBtn.classList.add('active');
        if (svg) svg.setAttribute('fill', 'currentColor');
        if (label) label.textContent = 'お気に入り済み';
      } else {
        favBtn.classList.remove('active');
        if (svg) svg.setAttribute('fill', 'none');
        if (label) label.textContent = 'お気に入り';
      }
    });
  }
}

function renderGrid(videos, data) {
  const grid = document.getElementById('playlistGrid');
  grid.innerHTML = '';

  if (!videos.length) {
    grid.innerHTML = `<div class="pl-error"><p>動画が見つかりませんでした。</p></div>`;
    return;
  }

  const pageOffset = (currentPage - 1) * 100;
  const missingIcons = [];
  videos.forEach((video, i) => {
    const card = createVideoCard(video);
    const globalIndex = pageOffset + i;
    card.href = `/watch?v=${video.videoId}&list=${encodeURIComponent(playlistId)}&index=${globalIndex}`;
    grid.appendChild(card);
    if (!video.authorThumbnails && video.authorId) {
      missingIcons.push({ card, authorId: video.authorId });
    }
  });
  if (missingIcons.length > 0) fillMissingIcons(missingIcons);
}

function renderPagination(page, total) {
  const pagEl = document.getElementById('plPagination');
  const prevBtn = document.getElementById('plPrevBtn');
  const nextBtn = document.getElementById('plNextBtn');
  const pageInfo = document.getElementById('plPageInfo');

  const totalPages = total > 0 ? Math.ceil(total / 100) : null;
  const hasNext = totalPages ? page < totalPages : videosPerPage >= 100;
  const hasPrev = page > 1;

  if (!hasNext && !hasPrev) {
    pagEl.hidden = true;
    return;
  }

  pagEl.hidden = false;
  prevBtn.disabled = !hasPrev;
  nextBtn.disabled = !hasNext;
  pageInfo.textContent = totalPages ? `${page} / ${totalPages} ページ` : `${page} ページ`;

  prevBtn.onclick = () => navigatePage(page - 1);
  nextBtn.onclick = () => navigatePage(page + 1);
}

function navigatePage(page) {
  const url = new URL(location.href);
  url.searchParams.set('list', playlistId);
  url.searchParams.set('page', page);
  history.pushState({}, '', url.toString());
  currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadPlaylist(page);
}

function formatUpdated(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function init() {
  if (!playlistId) return;
  initHeaderSearch();
  loadPlaylist(currentPage);
}

init();
})();
