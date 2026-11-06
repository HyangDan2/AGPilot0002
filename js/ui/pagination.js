/**
 * HD2Lab Todo Master - Pagination Component
 * Renders client-side pagination controls with page size selector (10, 20, 50).
 */

export function renderPaginationControls(container, paginationState, { onPageChange, onPageSizeChange }) {
  if (!container) return;
  const { totalItems, totalPages, currentPage, pageSize, startIndex, endIndex } = paginationState;

  if (totalItems === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  // Generate page numbers with ellipsis for long lists
  const pageNumbers = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  container.innerHTML = `
    <div class="pagination-info" aria-live="polite">
      총 <span class="highlight-num">${totalItems}</span>개 중 
      <span class="range-num">${startIndex + 1}–${endIndex}</span>개 표시
      (페이지 <span class="current-p">${currentPage}</span> / ${totalPages})
    </div>

    <div class="pagination-nav" role="navigation" aria-label="할 일 목록 페이지 이동">
      <button 
        type="button" 
        class="page-btn prev-btn" 
        data-page="${currentPage - 1}" 
        ${currentPage <= 1 ? 'disabled aria-disabled="true"' : ''}
        aria-label="이전 페이지"
      >
        ‹ 이전
      </button>

      <div class="page-numbers">
        ${startPage > 1 ? `
          <button type="button" class="page-num-btn" data-page="1">1</button>
          ${startPage > 2 ? '<span class="page-ellipsis">…</span>' : ''}
        ` : ''}

        ${pageNumbers.map(p => `
          <button 
            type="button" 
            class="page-num-btn ${p === currentPage ? 'active' : ''}" 
            data-page="${p}"
            ${p === currentPage ? 'aria-current="page"' : ''}
          >
            ${p}
          </button>
        `).join('')}

        ${endPage < totalPages ? `
          ${endPage < totalPages - 1 ? '<span class="page-ellipsis">…</span>' : ''}
          <button type="button" class="page-num-btn" data-page="${totalPages}">${totalPages}</button>
        ` : ''}
      </div>

      <button 
        type="button" 
        class="page-btn next-btn" 
        data-page="${currentPage + 1}" 
        ${currentPage >= totalPages ? 'disabled aria-disabled="true"' : ''}
        aria-label="다음 페이지"
      >
        다음 ›
      </button>
    </div>

    <div class="pagination-size">
      <label for="pageSizeSelect" class="size-label">페이지당</label>
      <select id="pageSizeSelect" class="size-select" aria-label="페이지당 표시 개수">
        <option value="10" ${pageSize === 10 ? 'selected' : ''}>10개씩</option>
        <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개씩</option>
        <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개씩</option>
      </select>
    </div>
  `;

  // Attach event handlers
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages && page !== currentPage) {
        onPageChange(page);
      }
    });
  });

  const sizeSelect = container.querySelector('#pageSizeSelect');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', (e) => {
      const newSize = parseInt(e.target.value, 10);
      if ([10, 20, 50].includes(newSize) && newSize !== pageSize) {
        onPageSizeChange(newSize);
      }
    });
  }
}
