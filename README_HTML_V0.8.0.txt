Fox × Snake × Cat × Dragon × Crystal Beast
HTML V0.8.0 · GitHub Pages 完整网站交付说明
日期：2026-11-13

【更新内容】
1. 在已完成的四角色 HTML V0.7.2 末尾增加第五位「紫晶兽 · 3D」。
2. 四位角色排列：狐女 / 蛇女 / 猫女 / 龙女 / 紫晶兽，按钮循环切换（01/05～05/05）。
3. 顶部标注 2.5D 与 3D。第五位在原人物框中显示真正立体模型，角色信息和右侧控制区同步切换为 3D 内容。
4. 第五位导入 Tripo GLB，拥有 65 个 Mixamo 骨骼关节，两段独立动画：afraid.001（害怕）、box_01.001（拳击）。
5. 3D 操作：鼠标拖动 / 手机单指旋转，滚轮 / 手机双指缩放，按 1 / 2 切换动作，Space 暂停或继续，R 重置视角。右侧按钮也可操作。
6. 前四位 2.5D 立绘及全部旧功能（T/H/F、局部发色衣服换色、桌面放大镜、手机取消放大镜、飘雪、音乐）保持原样。
7. 第五位仅在选中时才加载 3D，避免拖慢前四位。网页模型在不改变三维网格、骨骼和动画的前提下，将三张原 4K 贴图优化至 2K，减少手机加载及显存压力。

【上传 GitHub Pages】
1. 解压本 ZIP。
2. 进入 Fox_Snake_Cat_Dragon_Crystal_Avatar_HTML_V0.8.0_GitHub_Pages_Full 文件夹。
3. 将文件夹内部全部文件（index.html、app.js、monster3d.js、style.css、assets/、1.mp3 等）上传到 GitHub Pages 仓库根目录。
4. 通过 https://<user>.github.io/<repo>/ 打开测试；如浏览器仍显示旧版，尝试强制刷新或清除网页缓存。
5. 点击右箭头 4 次进入第五位紫晶兽；首次加载约 10.8 MB 的 GLB，需要等待网络传输。查看两个动作和 360 度旋转，随后返回四位 2.5D 验证旧功能。

【技术限制与注意】
- 网站适用于 HTTPS（GitHub Pages）；不要直接双击本地 index.html 测试 3D，浏览器的文件安全限制可能阻止模块和 GLB 读取。
- 3D 查看器采用 Three.js 0.180.0 官方发布的 ESM，通过固定版本的 jsDelivr CDN 按需读取；因此首次加载第五位时必须联网。GLB 模型文件本身已包含在 ZIP 中，无需 Tripo 网站实时连接。
- 3D 使用 WebGL；某些低性能手机、禁用 WebGL 的浏览器或受限制的网络可能无法渲染。无法加载时会显示提示，不影响其他四位。
- 真实电脑 / 手机 WebGL GPU 实机效果仍需你在自己的 Chrome / Android 浏览器测试确认；当前已验证网站结构和第 5 位的显示／切换逻辑，以及 GLB 模型、骨骼、动画与文件完整性。
- 如希望模型更细腻，可以将原 4K Tripo GLB 另行制作桌面高画质版本；本交付默认 2K 网页优化版。

【项目文件】
index.html        五角色主界面
style.css         原网站外观、飘雪背景和第 5 位 3D 面板
app.js            四角色原 2.5D 逻辑 + 第五位切换适配
monster3d.js      第 5 位模型、动画、旋转和缩放（按需初始化）
assets/crystal_monster_web.glb    Tripo 水晶怪兽网页优化模型
bgm.js            原背景音乐自动循环
snow.js           原透明飘雪
magnifier.js      原桌面放大镜（手机不启用）
1.mp3             原音乐
assets/*.png       四位 2.5D 角色原立绘、动作遮罩
.nojekyll         GitHub Pages 配置
docs/README_HTML_V0.7.2_original.txt   V0.7.2 历史说明

原 Godot V0.2.5 / 独立 Crystal Monster Godot ZIP 均未被修改或覆盖。
