// Floating button and sidebar logic for Hiair extension
function createHiairFloatingButton() {
  if (document.getElementById('hiair-floating-btn')) return;

  // Create floating button
  const btn = document.createElement('div');
  btn.id = 'hiair-floating-btn';
  btn.style.cssText = `
    position: fixed;
    top: 32px;
    right: 32px;
    width: 56px;
    height: 56px;
    background: #2dc2e9;
    border-radius: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.13);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    transition: box-shadow 0.2s;
    user-select: none;
  `;

  // Icon image
  const icon = document.createElement('img');
  const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : undefined;
  if (chromeObj && chromeObj.runtime && chromeObj.runtime.getURL) {
    icon.src = chromeObj.runtime.getURL('source/assets/icons/favicon-128.png');
  } else {
    icon.src = '/source/assets/icons/favicon-128.png';
  }
  icon.alt = 'Hiair';
  icon.style.cssText = 'width: 32px; height: 32px; pointer-events: none;';
  btn.appendChild(icon);

  // X button (hidden by default)
  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: -12px;
    left: -12px;
    width: 28px;
    height: 28px;
    background: #2dc2e9;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.13);
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  `;
  btn.appendChild(closeBtn);

  // Show X on hover
  btn.addEventListener('mouseenter', () => {
    closeBtn.style.opacity = '1';
    closeBtn.style.pointerEvents = 'auto';
  });
  btn.addEventListener('mouseleave', () => {
    closeBtn.style.opacity = '0';
    closeBtn.style.pointerEvents = 'none';
  });

  // Hide button on X click
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.remove();
  });

  // Show sidebar on button click
  btn.addEventListener('click', (e) => {
    // Prevent drag from triggering sidebar
    if ((e as any)._dragging) return;
    btn.style.display = 'none';
    createHiairSidebar(() => {
      btn.style.display = 'flex';
    });
  });

  // --- Drag logic for Y axis on right side ---
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  btn.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    startY = e.clientY;
    startTop = btn.offsetTop;
    btn.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    let newTop = startTop + deltaY;
    // Clamp to viewport
    const minTop = 0;
    const maxTop = window.innerHeight - btn.offsetHeight;
    newTop = Math.max(minTop, Math.min(maxTop, newTop));
    btn.style.top = newTop + 'px';
    btn.style.right = '32px'; // Always snap to right
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      btn.style.cursor = 'grab';
      document.body.style.userSelect = '';
    }
  });

  document.body.appendChild(btn);
}

function createHiairSidebar(onClose: (() => void) | undefined) {
  if (document.getElementById('hiair-sidebar')) return;

  // Font loading logic (same as before)
  let fontUrl = '';
  const chromeObj = typeof window !== 'undefined' ? (window as any).chrome : undefined;
  if (chromeObj && chromeObj.runtime && chromeObj.runtime.getURL) {
    fontUrl = chromeObj.runtime.getURL('source/assets/fonts/Archicoco/Archicoco.otf');
  } else {
    fontUrl = '/source/assets/fonts/Archicoco/Archicoco.otf';
  }
  const fontFace = new FontFace('Archicoco', `url('${fontUrl}') format('opentype')`);

  fontFace.load().then(function(loadedFace) {
    document.fonts.add(loadedFace);
    injectSidebar();
  }).catch(function() {
    injectSidebar();
  });

  function injectSidebar() {
    if (document.getElementById('hiair-sidebar')) return;
    const sidebar = document.createElement('div');
    sidebar.id = 'hiair-sidebar';
    sidebar.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.13);
      z-index: 10001;
      font-family: 'Archicoco', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      color: #222;
      padding: 0;
      border: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
    `;

    sidebar.innerHTML = `
      <div style="padding: 18px 18px 0 18px; display: flex; align-items: center;">
        <span style="font-size: 28px; font-family: 'Archicoco', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; letter-spacing: -0.5px;">Hiair</span>
        <div style="margin-left: auto; display: flex; gap: 8px;">
          <button id="hiair-sidebar-close" style="background: none; border: none; cursor: pointer; font-size: 22px; color: #bdbdbd;">&#10005;</button>
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin: 18px 18px 0 18px;">
        <button style="flex:1; background: #e6f7fa; color: #00b6e6; border: none; border-radius: 6px 6px 0 0; padding: 8px 0; font-weight: 600; cursor: pointer;">Autofill</button>
        <button style="flex:1; background: #f5f5f5; color: #bdbdbd; border: none; border-radius: 6px 6px 0 0; padding: 8px 0; font-weight: 600; cursor: pointer;">Profile</button>
      </div>
      <div style="background: #00b6e6; color: #fff; border-radius: 10px; margin: 18px; padding: 18px 16px 16px 16px; display: flex; flex-direction: column; align-items: flex-start;">      
        <button style="background: #fff; color: #00b6e6; border: none; border-radius: 6px; padding: 8px 18px; font-weight: 600; font-size: 15px; cursor: pointer;">⚡ Autofill</button>
      </div>
      <div style="margin: 0 18px 18px 18px; background: #fafbfc; border-radius: 8px; padding: 0;">
        <div style="display: flex; align-items: center; padding: 14px 0 14px 0; border-bottom: 1px solid #ececec;">
          <span style="background: #f3e8ff; color: #b39ddb; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 12px 0 12px; font-size: 18px;">📄</span>
          <span style="flex:1;">Resume</span>
          <span style="color: #00b6e6; font-weight: 500; cursor: pointer; margin-right: 16px;">Preview</span>
        </div>
        <div style="display: flex; align-items: center; padding: 14px 0 14px 0; border-bottom: 1px solid #ececec;">
          <span style="background: #ffe0e0; color: #e57373; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; margin: 0 12px 0 12px; font-size: 18px;">✏️</span>
          <span style="flex:1;">Cover Letter</span>
          <span style="color: #bdbdbd; margin-right: 16px;">No Field Found</span>
        </div>
      </div>
    `;

    // Sidebar close button
    sidebar.querySelector('#hiair-sidebar-close')?.addEventListener('click', () => {
      sidebar.remove();
      if (typeof onClose === 'function') onClose();
    });

    document.body.appendChild(sidebar);
  }
}

if (window.location.hostname.includes('ashbyhq.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createHiairFloatingButton);
  } else {
    createHiairFloatingButton();
  }
}

export {};
