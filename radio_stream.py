#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
radio_stream.py - 云听(radio.cn)电台流地址获取/代理工具

问题背景:
  radio.cn 的直播流地址 (ytcastmp3.radio.cn/xx/stream_xxxxx.mp3?key=..&time=..)
  带防盗链签名, 有时效(通常数天), 过期后返回 403。
  但每次调用官方列表 API 都会返回新鲜有效的签名地址。

本工具:
  1) 查询模式: 按关键词查电台, 输出最新有效 mp3/m3u8 播放地址
  2) 代理模式: 起本地 HTTP 服务, 每次请求动态拉新签名, 返回一个
     "永不过期" 的本地地址, 收藏后无需再 F12 找台

用法:
  python3 radio_stream.py [关键词] [-p 省份码] [--list] [--https] [--m3u8]
     关键词   查电台, 默认输出所有匹配台的高码率 mp3 地址
     -p       省份码(默认 440000=广东; 0=全部)
     --list   只列出匹配的台名+id, 不输出地址
     --https  把返回地址转成 https
     --m3u8   输出 m3u8 地址而非 mp3
     --url-only 只输出第一个匹配台的 URL(纯URL,无台名) 用于 bat 脚本解析
     --station N 用预设编号选台(1=汕头音乐 2=汕头综合), 避免 bat 传中文编码问题
     --serve PORT  启动永续代理服务

示例:
  python3 radio_stream.py 汕头                 # 汕头所有台的最新mp3地址
  python3 radio_stream.py 汕头音乐 --https     # https 地址
  python3 radio_stream.py --list 广东          # 列出广东所有台
  python3 radio_stream.py --serve 8123         # 起代理: http://localhost:8123/
"""

import sys
import time
import json
import hashlib
import urllib.request
import urllib.parse

SCRIPT_VERSION = "1.2.0"

# 签名密钥 (来自 radio.cn 官方前端 api.js, 硬编码公开)
SIGN_KEY = "f0fc4c668392f9f9a447e48584c214ee"
API_HOST = "https://ytmsout.radio.cn"

# 预设台位 (供 --station 使用)
STATIONS = {
    1: "汕头音乐",
    2: "汕头综合",
    3: "潮州交通音乐",
    4: "潮州综合",
    5: "清远交通音乐",
}

# 常用省份码
PROVINCES = {
    "广东": 440000, "北京": 110000, "上海": 310000, "江苏": 320000,
    "浙江": 330000, "福建": 350000, "山东": 370000, "湖北": 420000,
    "湖南": 430000, "四川": 510000, "国家": 0,
}


def call_api(path, params):
    """调用 radio.cn ms API, 自动计算 sign"""
    tm = int(time.time() * 1000)
    sort = "&".join(f"{k}={params[k]}" for k in sorted(params))
    sign_text = f"{sort}&timestamp={tm}&key={SIGN_KEY}"
    sign = hashlib.md5(sign_text.encode()).hexdigest().upper()
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "version": "4.0.0",
        "providerCode": "25010",
        "equipmentSource": "WEB",
        "equipmentId": "0000",
        "platformCode": "WEB",
        "timestamp": str(tm),
        "sign": sign,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        "Referer": "https://www.radio.cn/pc-portal/erji/radioStation.html",
    }
    qs = urllib.parse.urlencode(params)
    url = f"{API_HOST}{path}?{qs}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[错误] API 请求失败: {e}", file=sys.stderr)
        return None


def get_stations(province_code=440000):
    """获取指定省份所有电台"""
    j = call_api("/web/appBroadcast/list",
                 {"categoryId": "0", "provinceCode": str(province_code)})
    if not j or j.get("code") != 0:
        print(f"[错误] 列表接口异常: {j}", file=sys.stderr)
        return []
    data = j.get("data", [])
    if isinstance(data, dict):
        data = data.get("list") or data.get("records") or []
    return data


def pick_url(item, want_m3u8=False, want_https=False):
    """从电台条目中挑最佳播放地址"""
    if want_m3u8:
        u = item.get("playUrlLow") or item.get("playUrl") or ""
    else:
        u = (item.get("mp3PlayUrlHigh") or item.get("mp3PlayUrlLow")
             or item.get("playUrlLow") or "")
    if not u:
        return ""
    if want_https:
        u = u.replace("http://", "https://")
    return u


def query(keyword=None, province_code=440000, want_m3u8=False, want_https=False):
    """按关键词查询电台, 返回 (台名, contentId, 播放地址) 列表"""
    stations = get_stations(province_code)
    results = []
    for it in stations:
        title = it.get("title") or it.get("name") or ""
        if keyword and keyword not in title:
            continue
        url = pick_url(it, want_m3u8, want_https)
        results.append((title, it.get("contentId"), url))
    return results


def serve(port):
    """永续代理服务: 每次请求动态拉新签名地址并 302 跳转"""
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            kw = urllib.parse.unquote(self.path.lstrip("/"))
            if not kw or kw == "/" or kw == "favicon.ico":
                kw = "汕头音乐"
            try:
                res = query(kw, want_https=True)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
                return
            if not res:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(f"未找到: {kw}".encode())
                return
            url = res[0][2]
            if not url:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(f"该台无可用地址: {res[0][0]}".encode())
                return
            self.send_response(302)
            self.send_header("Location", url)
            self.send_header("X-Station", urllib.parse.quote(res[0][0]))
            self.end_headers()

        def log_message(self, *args):
            pass

    print(f"永续电台代理已启动: http://localhost:{port}/{urllib.parse.quote('汕头音乐')}")
    print("用法: 浏览器/播放器打开上面的本地地址, 每次自动拿新签名, 永不 403")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


def main():
    args = [a for a in sys.argv[1:]]
    kwargs = {"province_code": 440000}
    keyword = None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--list":
            kwargs.setdefault("list_only", True)
        elif a == "--https":
            kwargs["want_https"] = True
        elif a == "--station":
            n = int(args[i + 1]) if i + 1 < len(args) else None
            i += 1  # 消费台号参数
            if n is None:
                print("需要 --station 编号")
                return
            if n not in STATIONS:
                print(f"无效台号 {n}, 可选: " + ", ".join(f"{k}={v}" for k, v in STATIONS.items()))
                return
            keyword = STATIONS[n]
            kwargs["url_only"] = True
        elif a == "--m3u8":
            kwargs["want_m3u8"] = True
        elif a == "--url-only":
            kwargs["url_only"] = True
        elif a == "--serve":
            serve(int(args[i + 1]) if i + 1 < len(args) else 8123)
            return
        elif a.startswith("-p"):
            kwargs["province_code"] = int(args[i + 1])
            i += 1
        elif a in PROVINCES:
            kwargs["province_code"] = PROVINCES[a]
        elif a.startswith("-"):
            print(f"未知参数: {a}")
            return
        else:
            keyword = a
        i += 1

    results = query(keyword,
                    kwargs.get("province_code", 440000),
                    kwargs.get("want_m3u8", False),
                    kwargs.get("want_https", False))
    if not results:
        print(f"未找到匹配电台: {keyword or '全部'}")
        return
    if kwargs.get("url_only"):
        for _, _, url in results:
            if url:
                print(url)
                return
        print("无地址")
        return
    for title, cid, url in results:
        if kwargs.get("list_only"):
            print(f"{title}  contentId={cid}")
        elif url:
            print(f"{title}\n  {url}")
        else:
            print(f"{title}  [无地址]")


if __name__ == "__main__":
    main()
