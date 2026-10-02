# 星镜 / Arcana

纯静态的中英双语塔罗网站，入口 `tarot/index.html`，无需构建，可由 GitHub Pages 托管。与周易共用原来的 Gemini 地址、密钥与限流额度。

## 功能

- 完整 78 张牌，采用 1909 年伟特—史密斯首版「Roses & Lilies」扫描图与同版玫瑰百合牌背，保留完整原画、印字和纸张质感（力量 VIII、正义 XI）。详细双语说明包括画面线索、元素、数字／宫廷角色、占星对应、正逆位解释与反思问题，均为本站编写。
- 单牌、三牌、五牌，可手动选择或自动补齐，可启用正逆位。
- Web Crypto 安全随机数、拒绝采样和 Fisher–Yates 洗牌，不重复抽取；正逆位独立各 50%。安全随机源失败时停止，不降级为 `Math.random`。
- AI 结合实际牌位、正逆位、问题解读，输出语言随页面语言。仅在点击按钮时调用 Gemini。
- 牌面查询、本地日记（主动保存，最多 30 条）和 JSON 导出。日记与 JSON 不含 AI 回答、API 密钥或 IP。
- 浏览器内生成一张 PNG 长图，先预览再下载，包含原问题、完整牌阵、属性、牌意和当前已完成的 AI 回答；也支持没有 AI 回答的占卜。生成时固定当前记录、语言和回答，防止切换牌阵时混入旧回答。
- 整体中英切换，记住手动选择。IP 出口为 CN/HK/TW/MO 时默认中文，其他地区英文；查询失败采用浏览器首选语言。

## 本机运行

仓库根目录：

```powershell
node iching/serve.mjs
node --test tarot/tests/*.test.mjs iching/tests/*.test.mjs appwrite/iching-probe/tests/*.test.mjs
```

访问 `http://127.0.0.1:4173/tarot/`。预览仅开放 `iching`、`tarot`、`divination` 三个目录。

## 牌面来源

原画作者为 Pamela Colman Smith，原版扫描由 Saskia Jansen 提供。图片来自 Wikimedia Commons 的 [1909 年 Roses & Lilies 牌组](https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck_(Roses_%26_Lilies))，所采用的 79 个文件均在来源页标记为 Public domain。牌背作者未确定，可能为 Pamela Colman Smith；逐张来源、原文件校验值、扫描尺寸与处理后的文件校验值记录在 [sources.json](assets/rws-1909/sources.json)。

图片保存在本站 `assets/rws-1909/`，运行时不依赖 Commons。仅等比例缩小并编码为 WebP，不裁切、重绘或改色。320 像素缩略图用于牌阵和牌库，720 像素版本用于放大查看；浏览器按显示尺寸与像素密度选择图片，牌库采用延迟加载。原图英文印字保留，牌外名称随中英切换，牌意窗口可打开完整牌面。

重新导入时，在仓库根目录运行 `node scripts/tarot/import-rws.mjs`。此开发脚本需要可访问 Commons 的网络，以及可导入的 `sharp`；若使用独立工具环境，可用 `TAROT_SHARP_MODULE` 指定 Sharp 的模块 URL。它校验每张图的年份、公有领域标记、大小与原文件 SHA-1，缓存原文件到被 Git 忽略的 `tmp/tarot-art/originals/`，然后生成本地图片与来源清单。网站本身无需安装 Sharp 或重新部署 Gemini 云服务。

## 共用接口

前端通过 `reading-request.mjs` 在现有 `question` 字段后附加固定的属性阅读重点（元素、数字／宫廷角色、黄金黎明占星对应），不增加字段，不接受任意系统提示词，也不修改云端程序。用户原问题在页面、日记与导出中保持原样。新问题上限 140 字，为云接口原有的 200 字限制预留上下文空间；旧日记仍能读取和导出，超过 140 字的旧问题会在请求 AI 前提示重新以较短问题占卜。新介绍与属性统计在前端完成，Gemini 仍使用云端原有的规范提示词，并按附加的关注点解读。

属性口径及来源见 `knowledge.mjs`：占星对应参考 [Book T / Liber LXXVIII](https://sacred-texts.com/oto/lib78.htm)，沿用伟特 VIII／XI 顺序。行星型大牌不固定单一元素，王牌不指定单一星座，宫廷牌以角色解释。牌阵属性统计只是观察角度，不用元素缺失作必然结论。

长图由 `image-export.mjs` 使用原生 Canvas 绘制，不调用截图服务，不上传问题、回答或图片，不需要新依赖。同源牌面避免跨域污染；中英文按实际字体测量换行，长回答按内容计算高度，并控制像素面积与最大高度以兼顾手机内存。未完成、已取消、其他牌阵或其他语言的 AI 回答不会写入当前长图；截断的回答会保留并标注。仅显式下载的 PNG 包含 AI 回答，刷新后不会从日记恢复。

公开地址仍使用 `iching/ai-config.mjs`。塔罗请求：

```json
{"kind":"tarot","language":"zh","question":"我可以如何推进？","spread":"three","cards":[{"id":0,"reversed":false},{"id":17,"reversed":true},{"id":77,"reversed":false}]}
```

服务端校验 0–77 的牌 ID、数量、无重复、正逆位，由 `divination/prompt.mjs` 分流，根据服务器保存的牌意生成提示词。旧周易的 `{question, values}` 保持兼容。不接收前端自定义系统提示词。

新版健康接口包含 `capabilities: ["iching", "tarot"]`。塔罗跳过未升级的 Appwrite；旧部署仍可服务周易。已知大陆 IP 优先选择升级后的新加坡线路；未知地区先使用已连通线路。健康检查不调用 Gemini，每次点击最多发送一次生成请求，失败不自动换线路重发。

Cloudflare 和 Appwrite 均已于 2026-10-02 升级。用户上传并激活 Appwrite 1.2.0 后，实际塔罗解读与旧周易解读均已验证成功；`/ai/health` 返回 `capabilities:["iching","tarot"]`，网页自动启用这条线路，无需再配置。以下保留今后重新生成和上传包的方法：

```powershell
node appwrite/iching-probe/scripts/package.mjs
```

生成 `appwrite/iching-probe/dist/iching-appwrite-probe.tar.gz`。在 **原有函数**的 Deployments → Create deployment → Manual 上传，入口 `src/main.js`，构建 `npm install --omit=dev`，勾选构建后激活。Node.js 22、30 秒超时、Any 执行权限、现有 WAF、`PUBLIC_AI_ENABLED=true` 和 Secret 保持原设置。无需新地址、新项目、新密钥。新版 `/ai/health` 包含 `"tarot"` 后，网页自动恢复此线路。详见 [Appwrite 说明](../appwrite/iching-probe/README.md)。

## 地区与隐私

使用 [Country.is 官方 API](https://country.is/) 的 `GET https://api.country.is/`。请求不含问题、牌阵、凭据和来源路径，响应中的 IP 不使用、不保存，只保留当前页面使用的国家代码。VPN 出口会影响默认语言，手动选择优先，迟到的查询不会覆盖选择。查询失败不影响抽牌或语言按钮。

AI 回答以纯文本显示，不执行模型返回的 HTML。浏览器端没有 Gemini 密钥。上传包采用文件白名单，不含 `.env`、凭据、依赖或本地记录。
