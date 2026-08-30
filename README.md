# 云听电台工具集 (radio-cn-tools)

解决 radio.cn (云听) 直播流地址签名过期(403)问题的工具集。

## 背景

radio.cn 直播流地址如 `https://ytcastmp3.radio.cn/90/stream_11076.mp3?type=1&key=***&time=...` 带防盗链签名 (key+time)，时段性有效，过期返回 403。但官方列表 API 每次调用都会返回**新鲜有效签名**的地址，因此可动态获取。

## 文件

| 文件 | 说明 |
|------|------|
| `radio_stream.py` | 核心工具：调官方列表 API（复刻前端签名算法）获取新鲜播放地址。支持按关键词查台、`--url-only` 输出纯 URL |
| `radio.bat` | Windows 引导脚本：输入 1/2 选台（汕头音乐/汕头综合），调 WSL python 拿最新地址 → 默认浏览器播放 |
| `radio_fav.user.js` | 油猴(Tampermonkey)脚本：云听电台页"类型："行加收藏入口，电台卡片星标收藏/取消，收藏播放自动刷新签名 |

## 使用方法

### 命令行 (Linux/WSL)

```bash
python3 radio_stream.py 汕头                # 查汕头所有台最新地址
python3 radio_stream.py 汕头音乐 --url-only # 只输出纯 URL
python3 radio_stream.py 汕头 --https        # https 地址
```

### Windows

双击 `radio.bat`，输入 1（汕头音乐）或 2（汕头综合），自动获取地址并用浏览器播放。依赖 WSL + python3。

### 收藏油猴脚本

**一键安装**（点击即弹油猴安装确认）：

```
https://www.tampermonkey.net/script_installation.php#url=https://raw.githubusercontent.com/s1sunny/radio-cn-tools/main/radio_fav.user.js
```

或者手动：浏览器安装 Tampermonkey → 新建脚本 → 粘贴 `radio_fav.user.js` 内容 → 保存。打开云听电台页：
- "类型："行右侧出现 ★ 收藏 入口
- 电台卡片右上角 ☆/★ 一键收藏/取消
- 点击 ★ 收藏 弹出面板，点台名播放（自动重新拉新签名，不过期）、点 ✕ 取消

## API 说明

- 列表接口: `GET https://ytmsout.radio.cn/web/appBroadcast/list?categoryId=0&provinceCode=440000`
- 省份接口: `GET https://ytmsout.radio.cn/web/appProvince/list/all`
- 签名算法: 参数按 key 排序拼接 `k=v&k=v` + `&timestamp=<毫秒>&key=<SECRET>` → MD5 大写
- 请求头: `version: 4.0.0`, `providerCode: 25010`, `equipmentSource: WEB`, `equipmentId: 0000`, `platformCode: WEB`

## 已知电台映射 (contentId)

| 电台 | contentId | 流 |
|------|-----------|-----|
| 汕头音乐广播 | 1076 | stream_11076.mp3 |
| 汕头综合广播 | 1068 | stream_11068.mp3 |

## 版本

- radio_stream.py v1.1.0 (2026-08-30)
- radio.bat v1.0.0 (2026-08-30)
- radio_fav.user.js v1.0.0 (2026-08-30)