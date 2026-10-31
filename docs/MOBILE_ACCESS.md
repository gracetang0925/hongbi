# 全球手机访问 / Global mobile access

红笔沿用同一 GitHub 仓库、GitHub Pages 网址及服务端 API。手机用户可以扫描普通网址二维码，在浏览器打开，不需要微信账号。当前版本是可安装的手机网页（PWA），不是微信小程序，也没有上传到 Apple / Google 应用商店。

HongBi's mobile experience runs at the same public URL. Scan the QR with a phone camera and open the link, or open the link directly on the same phone. It is a progressive web app, not a WeChat mini program or an app-store release.

- 中文入口：[打开红笔](https://gracetang0925.github.io/hongbi/?lang=zh)
- English: [Open HongBi](https://gracetang0925.github.io/hongbi/?lang=en)
- 固定分享二维码 / QR: [PNG](../assets/hongbi-qr.png) · [SVG](../assets/hongbi-qr.svg)

## 使用 / Use

1. 扫码打开后，选择中文或 English，填写昵称，输入华文或点击“扫描作文”。儿童模式始终默认不评分。
2. 识别作文可用实时相机，也可用“手机拍照”或“选择照片”。相机权限不可用时，后两种入口和文字输入仍保留。
3. 照片在本机缩小为最长边 1600px 的 JPEG 预览；点击“使用这张”后才发给现有 OCR 接口。识别失败保留预览供重试。已有作文时，替换前会询问。
4. 阅读亮点和中英文原因，完成一句练习，再填写二稿。教师队列和邀请令牌仍使用现有网页后台。
5. 页面顶部可分享固定公开链接、下载二维码、查看“添加到桌面”方法。

English interface labels help families navigate; the learning material remains Chinese, with English explanations and practice hints supplied by the existing feedback contract. This is not automatic translation into every language.

## 添加到桌面 / Add to home screen

- iPhone / iPad：可在 Safari 的分享菜单选择“添加到主屏幕”。
- Android：支持的浏览器可能提供“安装应用”或“添加到主屏幕”。有原生安装提示时，页面按钮会打开提示；其他情况显示手动步骤。浏览器或设备不支持安装时，仍可直接使用网页。
- App icon / launch appearance comes from `manifest.webmanifest`; its relative scope and start URL work under `/hongbi/`.

安装能力因浏览器而异，参见 [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)。未宣称已在每一种实体手机上通过安装验收。

## 离线与数据 / Offline and data

- `sw.js` 只缓存显式列出的公开 HTML、脚本、CSS、图标和二维码。对教师页面、接口、POST 及跨域请求不做缓存或离线重放。
- 首次联网加载后，可离线重新打开编辑界面；AI、OCR、保存与教师批注需要网络。离线提示会明确说明这一点。
- 作文、照片、练习答案及会话凭证不写入 localStorage、IndexedDB 或 Service Worker Cache。只有界面语言、小墨开合偏好及原有种子／水滴奖励保存在本机。
- 关闭或刷新编辑页会开启新随机会话，未提交的作文不会自动恢复。页面不会为了更新 Service Worker 强制刷新正在编辑的内容。
- 分享链接固定为 `https://gracetang0925.github.io/hongbi/?lang=en&source=qr`；不复制当前地址中的私人参数，也不带姓名、作文、批注或教师令牌。
- 各地区能否顺畅访问还取决于 GitHub Pages、现有 Worker／模型服务的网络可达性。面向特定国家或中国大陆正式推广前，需要在当地真机网络测试，并按结果配置自有域名或区域接入；当前改动没有迁移后端或宣称全球网络保证。

## 开发与发布 / Development and release

```sh
python3 -m http.server 8000
# Open http://localhost:8000/?lang=en (not a file:// URL).
npm run check
npm test
```

GitHub Pages 仍从 main 根目录发布，当前无需 Wrangler 或数据库迁移。新增文件为 `mobile.js`、`mobile-core.js`、`mobile.css`、`sw.js`、manifest 和静态图标／二维码。没有增加网页运行时第三方依赖。

修改公共前端文件后，应同步更新 `sw.js` 的缓存版本；新增需要离线的公共文件时更新其显式列表。不要添加任何教师页或接口响应。

二维码由 `qrcode@1.5.4` 离线生成，M 级纠错、4 模块白边，使用独立 `jsqr@1.4.0` 解码核对公开 URL。若将来更换域名，必须同时更新 `mobile-core.js`、二维码及分发材料。

## 本次验证 / Validation

- Node CI 覆盖原有 Worker／页面行为，以及语言选择、manifest／图标和缓存边界。
- 隔离 Chrome、模拟 API：中英文切换不丢作文／练习，相机拒绝后的文件入口，选图后明确确认，OCR 失败保留照片并可重试，反馈失败保留作文，三种模式、拼音、HSK／儿童、二稿、教师批注和登录／退出回归。
- 真正注册的 Service Worker 验证离线 shell，缓存中无教师页或接口记录；320/390/620/768/1280px 检查无横向溢出。
- 没有把模拟 API 测试描述成新的真实模型调用或实体 iPhone／Android 真机认证。
