Fox Avatar V0.5.4 - GitHub Pages 静态网站版（循环背景音乐）
===========================================
这是专门适配 GitHub Pages 发布的独立 HTML 版本，含 index.html、style.css、app.js 与 assets/ 素材。
功能：发色、衣饰变色、尾巴轻摆、拖动、缩放。无眨眼、无旧 3D 入口。
新增：使用用户上传的 1.mp3 自动循环播放，不显示音乐按钮；网页播放器音量设为最大。

【发布步骤】
1. 访问 https://github.com/new 登录 GitHub。
2. 新建一个 Public 仓库，名称可用 FoxAvatar3D。
3. 下载并解压本 ZIP（不能只上传 ZIP 文件）。
4. 打开新仓库，点 Add file -> Upload files，把 index.html、style.css、app.js、bgm.js、1.mp3 与 assets 文件夹连同其中四张 PNG 上传。
   可选上传 README 文件；隐藏文件 .nojekyll 若无法选中，也不影响本版本。
5. 点击 Commit changes。
6. 打开 Settings -> Pages；在 Build and deployment 选择 Deploy from a branch；Branch 选择 main，文件夹选择 /(root)，点击 Save。
7. 发布完成后访问 https://你的GitHub用户名.github.io/FoxAvatar3D/
   仓库名称如果不同，网址路径也随之改变。

【说明】
- GitHub Pages 是静态网站托管，不需要购买服务器。不要只上传 ZIP 文件。
- GitHub Free 发布 Pages 时需要公开仓库。公开仓库的源代码和 PNG 图也会公开。
- 若你已有自己的主站，可以把本包内容放入站点的 fox-avatar/ 子目录，再通过 iframe 嵌入。
- 本网站版是独立 HTML/CSS/JS 版本，不是 Godot Web 直接导出。
- 这份 ZIP 已做结构检查，但最终上线及不同设备浏览器表现仍需你在 GitHub Pages 测试。

【背景音乐 / 自动播放的重要说明】
- 网页开始加载时会尝试有声自动播放，并使用 loop 不间断循环。
- Chrome、Safari、Firefox 和手机浏览器可能阻止没有用户手势的有声自动播放。这是浏览器策略，网站代码无法保证绕过。
- 如果自动播放被阻止，访客首次触摸、点击网页或按键时，音乐会开始；不需要额外的播放按钮。
- 浏览器/系统切到后台时可能暂停音频，切回来会尽量恢复；关闭网页则停止。
- 音量设为网页播放器最大值 1.0，但手机硬件/系统音量仍由设备控制。
- GitHub Pages 公开部署后，1.mp3 也会公开。上传前请确认有权公开使用此音乐。
- 已有 GitHub Pages 仓库：把这些文件上传到现有仓库的根目录，遇到同名文件可覆盖/提交；不用新建仓库。
