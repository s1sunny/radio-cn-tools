// ==UserScript==
// @name         云听电台收藏助手
// @namespace    radio.cn-fav
// @version      1.0.0
// @description  云听电台页"类型："行增加收藏功能：电台可一键收藏/取消，收藏列表点击播放（自动刷新签名地址，永不403）
// @match        https://www.radio.cn/pc-portal/erji/radioStation.html*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    if (window.__radioFavLoaded) return;
    window.__radioFavLoaded = true;

    var STORE_KEY = 'radio_favs_v1';
    var $ = window.jQuery;

    // ---------- 存储 ----------
    function getFavs() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function saveFavs(list) {
        localStorage.setItem(STORE_KEY, JSON.stringify(list));
        updateFavBtnCount();
        renderFavPanel();
    }
    function isFav(contentId) {
        return getFavs().some(function(f) { return String(f.contentId) === String(contentId); });
    }

    // ---------- 工具 ----------
    function parseBox(box) {
        // box 结构: <div class="box box1076"><p class="box_pic"><a onclick="playRadio('URL','IMG','NAME','','','1076')"><img src="IMG"></a></p></div>
        var anchor = box.querySelector('a');
        if (!anchor) return null;
        var onclick = anchor.getAttribute('onclick') || '';
        var m = onclick.match(/playRadio\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([^']*)'\s*\)/);
        if (!m) {
            var boxCls = (box.className.match(/box(\d+)/) || [])[1];
            var img = box.querySelector('img');
            return {
                contentId: boxCls,
                title: (img && (img.getAttribute('alt') || img.title)) || '未知电台',
                image: img ? img.src : ''
            };
        }
        return {
            contentId: m[4],
            title: m[3],
            image: m[2] ? new URL(m[2], location.href).href : '',
            url: m[1]
        };
    }

    // ---------- 样式 ----------
    var css = [
        '#rfFavBtn { cursor:pointer; margin-left:14px; padding:2px 8px; border:1px solid #d8a01a; border-radius:4px; color:#d8a01a; font-size:13px; background:#fff; white-space:nowrap; }',
        '#rfFavBtn:hover { background:#d8a01a; color:#fff; }',
        '#rfFavBtn.rf-active { background:#d8a01a; color:#fff; }',
        '.rf-star { position:absolute; top:3px; right:5px; z-index:99; cursor:pointer; font-size:17px; line-height:1; text-shadow:0 0 2px #fff,0 0 3px #fff; -webkit-user-select:none; user-select:none; }',
        '.rf-star.rf-on { color:#ffb400; }',
        '.rf-star.rf-off { color:#999; opacity:.85; }',
        '.rf-star:hover { transform:scale(1.25); }',
        '.rf-box { position:relative; }',
        '#rfPanel { position:fixed; right:16px; top:80px; width:280px; max-height:60vh; overflow-y:auto; background:#fff; border:1px solid #ddd; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.18); z-index:99999; display:none; font-size:13px; }',
        '#rfPanel .rf-phead { padding:8px 12px; font-weight:bold; border-bottom:1px solid #eee; color:#333; background:#fafafa; border-radius:8px 8px 0 0; }',
        '#rfPanel .rf-phead a { float:right; font-weight:normal; color:#999; cursor:pointer; }',
        '#rfPanel .rf-item { display:flex; align-items:center; padding:8px 10px; border-bottom:1px solid #f2f2f2; cursor:pointer; }',
        '#rfPanel .rf-item:hover { background:#f8f8f8; }',
        '#rfPanel .rf-item img { width:34px; height:34px; border-radius:4px; margin-right:8px; object-fit:cover; }',
        '#rfPanel .rf-item .rf-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#333; }',
        '#rfPanel .rf-item .rf-del { color:#e05a5a; font-size:16px; padding:0 4px; cursor:pointer; }',
        '#rfPanel .rf-item .rf-del:hover { color:#c00; }',
        '#rfPanel .rf-empty { padding:24px 12px; text-align:center; color:#aaa; }'
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // ---------- 收藏按钮(类型: 行) ----------
    function addFavBtn() {
        var typeRow = Array.prototype.find.call(
            document.querySelectorAll('.area_name'),
            function(el) { return el.textContent.indexOf('类型') >= 0; }
        );
        if (!typeRow || document.getElementById('rfFavBtn')) return;
        var btn = document.createElement('a');
        btn.id = 'rfFavBtn';
        btn.href = '#';
        btn.textContent = '★ 收藏';
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            togglePanel();
        });
        typeRow.appendChild(btn);
        updateFavBtnCount();
    }

    function updateFavBtnCount() {
        var btn = document.getElementById('rfFavBtn');
        if (!btn) return;
        var n = getFavs().length;
        btn.textContent = n ? ('★ 收藏(' + n + ')') : '★ 收藏';
    }

    // ---------- 收藏面板 ----------
    function ensurePanel() {
        var p = document.getElementById('rfPanel');
        if (p) return p;
        p = document.createElement('div');
        p.id = 'rfPanel';
        p.innerHTML = '<div class="rf-phead">我的收藏 <a id="rfClose">✕</a></div><div class="rf-body"></div>';
        p.querySelector('#rfClose').addEventListener('click', function() { p.style.display = 'none'; });
        document.body.appendChild(p);
        return p;
    }

    function togglePanel() {
        var p = ensurePanel();
        p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
        if (p.style.display === 'block') renderFavPanel();
    }

    function renderFavPanel() {
        var p = ensurePanel();
        var body = p.querySelector('.rf-body');
        var favs = getFavs();
        if (!favs.length) {
            body.innerHTML = '<div class="rf-empty">暂无收藏<br>点击电台右上角 ☆ 收藏</div>';
            return;
        }
        body.innerHTML = '';
        favs.forEach(function(fav) {
            var it = document.createElement('div');
            it.className = 'rf-item';
            it.innerHTML = '<img src="' + (fav.image || '') + '" onerror="this.style.visibility=\'hidden\'">' +
                '<span class="rf-name" title="' + fav.title + '">' + fav.title + '</span>' +
                '<span class="rf-del" title="取消收藏">✕</span>';
            it.querySelector('.rf-name').addEventListener('click', function() { playFav(fav); });
            it.querySelector('.rf-del').addEventListener('click', function(e) {
                e.stopPropagation();
                var list = getFavs().filter(function(f) { return String(f.contentId) !== String(fav.contentId); });
                saveFavs(list);
                updateStars();
            });
            body.appendChild(it);
        });
    }

    // ---------- 播放收藏(自动刷新签名) ----------
    function playFav(fav) {
        var done = false;
        var tryProvinces = [];
        if (fav.provinceCode) tryProvinces.push(String(fav.provinceCode));
        tryProvinces.push('440000'); // 广东(汕头等)
        tryProvinces.push('0');      // 国家台
        tryProvinces = tryProvinces.filter(function(v, i, a) { return a.indexOf(v) === i; });

        function attempt(i) {
            if (i >= tryProvinces.length) {
                if (!done) {
                    done = true;
                    alert('获取 ' + fav.title + ' 播放地址失败，请稍后重试');
                }
                return;
            }
            window.request({
                name: 'getRadioList',
                data: { categoryId: '0', provinceCode: tryProvinces[i] },
                sucFun: function(res) {
                    if (done) return;
                    var item = null;
                    if (res && res.code === 0 && res.data) {
                        var arr = Array.isArray(res.data) ? res.data
                            : (res.data.list || res.data.records || []);
                        item = arr.find(function(x) {
                            return String(x.contentId) === String(fav.contentId);
                        });
                    }
                    if (item) {
                        var u = item.mp3PlayUrlHigh || item.mp3PlayUrlLow || item.playUrlLow || item.playUrlMulti;
                        if (u) {
                            done = true;
                            window.playRadio(u, item.image || fav.image, fav.title, '', '', fav.contentId);
                            return;
                        }
                    }
                    attempt(i + 1);
                },
                failFun: function() { attempt(i + 1); }
            });
        }
        attempt(0);
    }

    // ---------- 电台卡片上的星标 ----------
    function addStars() {
        var frame = document.getElementById('tuviewerFrame');
        if (!frame) return;
        frame.querySelectorAll('.box').forEach(function(box) {
            if (box.querySelector('.rf-star')) return;
            var info = parseBox(box);
            if (!info || !info.contentId) return;
            box.style.position = 'relative';
            box.classList.add('rf-box');
            var star = document.createElement('span');
            star.className = 'rf-star ' + (isFav(info.contentId) ? 'rf-on' : 'rf-off');
            star.textContent = isFav(info.contentId) ? '★' : '☆';
            star.title = isFav(info.contentId) ? '取消收藏' : '收藏';
            star.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFav(info, star);
            });
            box.appendChild(star);
        });
        // 收藏面板按钮同步已收藏状态
        var p = document.getElementById('rfPanel');
        if (p && p.style.display === 'block') renderFavPanel();
    }

    function toggleFav(info, star) {
        var list = getFavs();
        var idx = list.findIndex(function(f) { return String(f.contentId) === String(info.contentId); });
        if (idx >= 0) {
            list.splice(idx, 1);
        } else {
            list.push({
                contentId: info.contentId,
                title: info.title,
                image: info.image,
                provinceCode: getCurProvince(),
                ts: Date.now()
            });
        }
        saveFavs(list);
        updateStars();
    }

    function updateStars() {
        var frame = document.getElementById('tuviewerFrame');
        if (!frame) return;
        frame.querySelectorAll('.box').forEach(function(box) {
            var star = box.querySelector('.rf-star');
            if (!star) return;
            var info = parseBox(box);
            if (!info) return;
            var on = isFav(info.contentId);
            star.className = 'rf-star ' + (on ? 'rf-on' : 'rf-off');
            star.textContent = on ? '★' : '☆';
            star.title = on ? '取消收藏' : '收藏';
        });
    }

    // 当前选中的省份(页面全局变量 place_id)
    function getCurProvince() {
        var pid = window.place_id;
        return pid ? String(pid) : '440000';
    }

    // ---------- 监听列表重渲染(MutationObserver) ----------
    var frame = document.getElementById('tuviewerFrame');
    if (frame) {
        new MutationObserver(function() {
            addStars();
        }).observe(frame, { childList: true, subtree: true });
    }
    // 兜底: 定时刷新星标(页面用 jQuery 重绘)
    setInterval(function() {
        addStars();
    }, 2000);

    // ---------- 初始化 ----------
    function init() {
        addFavBtn();
        addStars();
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();