// ==UserScript==
// @name         bplace.art Pixel Time Viewer
// @namespace    https://bplace.art/
// @version      2.2
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

            const isGuildWar = location.pathname.startsWith('/guildwar');

            if (
                (!isGuildWar && url.includes('/rest/v1/pixels')) ||
                (isGuildWar && url.includes('/rest/v1/guildwar_pixels'))
            ) {
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
    function tryAttach() {
        if (!lastUpdatedAt) return;

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
        if (!currentContainer || !lastUpdatedAt) return;

        let box = currentContainer.querySelector('[data-updated-at-box]');

        if (!box) {
            box = createBox();
            currentContainer.appendChild(box);
            startRelativeTimer(box);
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

        timeLine.innerHTML = `<span style="font-size: 16px;">⏰</span> ${
            lastUpdatedAt.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        }`;

        updateRelativeTime(relativeLine, lastUpdatedAt);

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
        let diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diffSec < 0) diffSec = 0;

        const years = Math.floor(diffSec / (365 * 24 * 60 * 60));
        diffSec -= years * 365 * 24 * 60 * 60;

        const months = Math.floor(diffSec / (30 * 24 * 60 * 60));
        diffSec -= months * 30 * 24 * 60 * 60;

        const days = Math.floor(diffSec / (24 * 60 * 60));
        diffSec -= days * 24 * 60 * 60;

        const hours = Math.floor(diffSec / (60 * 60));
        diffSec -= hours * 60 * 60;

        const minutes = Math.floor(diffSec / 60);
        diffSec -= minutes * 60;

        const seconds = diffSec;

        // pick largest two meaningful units
        const units = [
            { value: years, name: 'year' },
            { value: months, name: 'month' },
            { value: days, name: 'day' },
            { value: hours, name: 'hr' },
            { value: minutes, name: 'min' },
            { value: seconds, name: 'sec' }
        ];

        const display = [];
        for (let i = 0; i < units.length; i++) {
            if (units[i].value > 0) {
                display.push(`${units[i].value} ${units[i].name}${units[i].value !== 1 ? 's' : ''}`);
            }
            if (display.length >= 2) break;
        }

        // if all units are 0 (just placed), show seconds
        if (display.length === 0) display.push('0 sec');

        el.textContent = `Placed ${display.join(' ')} ago`;
    }
})();
