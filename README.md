# 人生重开模拟器（可配置事件版）

这是一个纯前端小游戏，直接打开网页即可游玩。

## 运行方式

由于 `events.json` 通过 `fetch` 读取，建议用本地静态服务器运行。

```bash
cd /Users/liushaoyi/life-restart-simulator
python3 -m http.server 8080
```

浏览器访问：`http://localhost:8080`

## 一键发布永久网址（GitHub Pages）

目标：生成可长期访问的网址，并且每次改代码后自动更新。

本项目已内置自动部署文件：`.github/workflows/deploy.yml`。

### 第一次发布

1. 在 GitHub 新建仓库（例如：`life-restart-simulator`，先不要添加 README）
2. 在本地项目目录执行：

```bash
cd /Users/liushaoyi/life-restart-simulator
git init
git add .
git commit -m "chore: init life restart simulator"
git branch -M main
git remote add origin https://github.com/<你的用户名>/life-restart-simulator.git
git push -u origin main
```

3. 打开仓库设置：`Settings -> Pages`
4. 在 `Build and deployment` 中将 `Source` 选择为 `GitHub Actions`
5. 等待 `Actions` 里的 `Deploy to GitHub Pages` 跑完

完成后访问：
`https://<你的用户名>.github.io/life-restart-simulator/`

### 后续自动更新

每次你改完代码后执行：

```bash
git add .
git commit -m "feat: update game content"
git push
```

几分钟内网页会自动更新到最新版本。

## 事件配置说明

配置文件：`events.json`

- `settings.maxAge`：最大年龄（当前仅用于配置语义，终局主要由事件或死亡概率触发）
- `settings.baseDeathByAge`：年龄自然死亡概率规则，按年龄阈值生效
- `initialStats`：初始属性
- `events`：事件数组

### 单个事件字段

- `id`：事件唯一 ID
- `title`：事件标题
- `description`：事件描述
- `minAge` / `maxAge`：触发年龄范围
- `weight`：权重，越高越容易被抽到
- `once`：是否只触发一次（可选）
- `conditions`：前置条件（可选）
- `effects`：属性变化（可选）
- `death`：触发后直接死亡（可选）

### conditions 示例

```json
{
  "conditions": [
    { "stat": "intelligence", "op": ">=", "value": 10 }
  ]
}
```

支持操作符：`>`, `>=`, `<`, `<=`, `==`, `!=`

### effects 示例

```json
{
  "effects": {
    "hp": -10,
    "wealth": 5,
    "mood": 2
  }
}
```

可用属性：`hp`, `intelligence`, `strength`, `mood`, `wealth`

