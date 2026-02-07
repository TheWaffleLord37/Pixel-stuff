// ==UserScript==
// @name         bplace.art Pixel Time Viewer
// @namespace    https://bplace.art/
// @version      1.8
// @description  Shows the latest update time and relative age when clicking a pixel
// @author       ChatGPT
// @match        https://bplace.art/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bplace.art
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {
    'use strict';

    const originalFetch = window.fetch;

    let lastUpdatedAt = null;
    let currentContainer = null;
    let containerObserver = null;
    let relativeTimer = null;

    /* ---------- FETCH INTERCEPT ---------- */

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);

        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;

            if (url.includes('/rest/v1/pixels')) {
                response.clone().json().then(data => {
                    if (!Array.isArray(data) || !data[0]?.updated_at) return;

                    lastUpdatedAt = new Date(data[0].updated_at);
                    tryAttach();
                }).catch(() => {});
            }
        } catch (_) {}

        return response;
    };

    /* ---------- GLOBAL OBSERVER ---------- */

    const globalObserver = new MutationObserver(() => {
        tryAttach();
    });

    globalObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    /* ---------- CORE LOGIC ---------- */

    function isGuildWar() {
        return location.pathname.startsWith('/guildwar');
    }

    function tryAttach() {
        if (!isGuildWar() && !lastUpdatedAt) return;

        const container = document.querySelector(
            'div.flex.justify-center.gap-\\[6px\\][style*="margin-top"]'
        );

        if (!container) return;

        if (container !== currentContainer) {
            currentContainer = container;

            if (containerObserver) containerObserver.disconnect();
            containerObserver = new MutationObserver(keepBoxLast);
            containerObserver.observe(container, { childList: true });
        }

        keepBoxLast();
    }

    function keepBoxLast() {
        if (!currentContainer) return;

        let box = currentContainer.querySelector('[data-updated-at-box]');

        if (!box) {
            box = createBox();
            currentContainer.appendChild(box);

            if (!isGuildWar() && lastUpdatedAt) {
                startRelativeTimer(box);
            }
        }

        if (currentContainer.lastElementChild !== box) {
            currentContainer.appendChild(box);
        }
    }

    /* ---------- BOX CREATION ---------- */

    function createBox() {
        const box = document.createElement('div');
        box.setAttribute('data-updated-at-box', 'true');
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.padding = '4px 12px';
        box.style.alignItems = 'center';
        box.style.gap = '2px';
        box.style.borderRadius = '8px';
        box.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        box.style.fontFamily = 'Aeonik';
        box.style.fontSize = '12px';
        box.style.fontWeight = '500';
        box.style.color = 'rgb(0, 0, 0)';
        box.style.textAlign = 'center';

        const timeLine = document.createElement('div');
        const relativeLine = document.createElement('div');

        relativeLine.style.fontSize = '11px';
        relativeLine.style.opacity = '0.75';
        relativeLine.setAttribute('data-relative-time', 'true');

        if (isGuildWar()) {
            timeLine.innerHTML = `<span style="font-size: 16px;">⏰</span> Unknown`;
            relativeLine.textContent =
                "(Accurate times for Guild War don't work 🙁)";
        } else {
            timeLine.innerHTML = `<span style="font-size: 16px;">⏰</span> ${
                lastUpdatedAt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })
            }`;

            updateRelativeTime(relativeLine, lastUpdatedAt);
        }

        box.appendChild(timeLine);
        box.appendChild(relativeLine);

        return box;
    }

    /* ---------- RELATIVE TIME ---------- */

    function startRelativeTimer(box) {
        if (relativeTimer) clearInterval(relativeTimer);

        const relativeLine = box.querySelector('[data-relative-time]');
        if (!relativeLine) return;

        relativeTimer = setInterval(() => {
            if (!lastUpdatedAt || !document.body.contains(box)) {
                clearInterval(relativeTimer);
                return;
            }
            updateRelativeTime(relativeLine, lastUpdatedAt);
        }, 1000);
    }

    function updateRelativeTime(el, date) {
        const diffMs = Date.now() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60) {
            el.textContent = `Placed ${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
            return;
        }

        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) {
            el.textContent = `Placed ${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
            return;
        }

        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) {
            el.textContent = `Placed ${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
            return;
        }

        const diffDay = Math.floor(diffHr / 24);
        if (diffDay < 30) {
            el.textContent = `Placed ${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
            return;
        }

        const diffMonth = Math.floor(diffDay / 30);
        if (diffMonth < 12) {
            el.textContent = `Placed ${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
            return;
        }

        const diffYear = Math.floor(diffMonth / 12);
        el.textContent = `Placed ${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
    }
})();
