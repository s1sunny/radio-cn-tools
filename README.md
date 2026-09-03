# 云听电台收藏助手 (radio-cn-tools)

> 解决 radio.cn (云听) 直播流地址签名过期(403)问题的油猴脚本

## 🚀 一键安装油猴脚本（电台收藏）

点击下方链接，Tampermonkey 会直接弹出安装确认框：

[**安装 云听电台收藏助手**](https://www.tampermonkey.net/script_installation.php#url=https://raw.githubusercontent.com/s1sunny/radio-cn-tools/main/radio_fav.user.js)

```
https://www.tampermonkey.net/script_installation.php#url=https://raw.githubusercontent.com/s1sunny/radio-cn-tools/main/radio_fav.user.js
```

安装后打开 [云听电台页](https://www.radio.cn/pc-portal/erji/radioStation.html)，在"类型："行右侧即可看到 **★ 收藏** 入口。

## 背景

radio.cn 直播流地址如 `https://ytcastmp3.radio.cn/90/stream_11076.mp3?type=1&key=***&time=...` 带防盗链签名 (key+time)，时段性有效，过期返回 403。但官方列表 API 每次调用都会返回**新鲜有效签名**的地址，因此可动态获取。

## 文件

| 文件 | 说明 |
|------|------|
| `radio_fav.user.js` | 油猴(Tampermonkey)脚本：云听电台页"类型："行加收藏入口，电台卡片星标收藏/取消，收藏播放自动刷新签名 |

## 使用方法

浏览器安装 Tampermonkey → 新建脚本 → 粘贴 `radio_fav.user.js` 内容 → 保存。打开云听电台页：

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

- radio_fav.user.js v1.0.0 (2026-08-30)
