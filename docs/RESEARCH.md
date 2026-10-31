# Research notes

## Which IntelliJ look?

- Since **IntelliJ IDEA 2025.3**, the **Islands** theme is the default for the New UI
  ([JetBrains blog](https://blog.jetbrains.com/platform/2025/12/meet-the-islands-theme-the-new-default-look-for-jetbrains-ides/)).
  Tool windows and the editor are rounded "islands" on a slightly different main window background.
- Plugin SDK guidance on Islands metrics: `Island.arc` 20 (= 10px), `Island.borderWidth` ~4–5px, main window
  background lighter than the editor in dark themes
  ([Supporting Islands theme](https://plugins.jetbrains.com/docs/intellij/supporting-islands-theme.html)).
- I could not find public information on which IntelliJ version/theme the ETH EProg exam machines use.
  **Open question — ask the course staff / a student who took the exam.** Themes are easy to swap (DECISIONS D3).

## Where the colors come from

All sources are in [JetBrains/intellij-community](https://github.com/JetBrains/intellij-community) (Apache-2.0):

| What | Path |
|---|---|
| Islands Dark UI theme | `platform/platform-resources/src/themes/islands/ManyIslandsDark.theme.json` |
| Islands Light UI theme | `platform/platform-resources/src/themes/islands/ManyIslandsLight.theme.json` |
| Islands Dark editor scheme | `platform/platform-resources/src/themes/islands/IslandSchemeDark.xml` (parent: Darcula) |
| Light editor scheme | `platform/platform-resources/src/themes/expUI/expUI_lightScheme.xml` |
| New UI dark/light (parents) | `platform/platform-resources/src/themes/expUI/expUI_dark.theme.json`, `expUI_light.theme.json` |
| Icons | `platform/icons/src/expui/**` (`*_dark.svg` = dark variant, `@20x20` = stripe size) |
| Terminal icon | `plugins/terminal/resources/icons/expui/toolwindow/` |

Theme JSON values are often palette names (`"gray-30"`) that reference the `colors` map, sometimes
transitively. To resolve a key, follow the chain until a `#RRGGBB` appears. Small resolver used:

```python
import json, re, sys
t = json.loads(re.sub(r'(?m)^\s*//.*$', '', open(sys.argv[1]).read())); C = t['colors']
def res(v, d=0): return res(C[v], d+1) if isinstance(v, str) and v in C and d < 20 else v
def flat(d, p=''):
    for k, v in d.items():
        yield from flat(v, p+k+'.') if isinstance(v, dict) else [(p+k, v)]
for k, v in flat(t['ui']):
    if re.search(sys.argv[2], k): print(k, '=', res(v))
```

Editor scheme XML: `<option name="KEY"><value><option name="FOREGROUND" value="cf8e6d"/>…`.
Values may omit leading zeros (`627a` = `#00627A`). `FONT_TYPE` 1 = bold, 2 = italic.
`EFFECT_TYPE` in scheme XML: 0 boxed, 1 underline, 2 wave underline, 3 strikeout.

### Key values (Islands Dark)

| Token | Value | Source key |
|---|---|---|
| Main window / toolbar / stripes / status bar bg | `#26282C` | `MainWindow.background` |
| Islands (tool windows, editor) bg | `#191A1C` | `ToolWindow.background`, scheme `TEXT` bg |
| UI text | `#D1D3D9` | `*.foreground` |
| Editor text | `#BCBEC4` | scheme `TEXT` |
| Keyword | `#CF8E6D` | `DEFAULT_KEYWORD` |
| String | `#6AAB73` | `DEFAULT_STRING` |
| Number | `#2AACB8` | `DEFAULT_NUMBER` |
| Comment | `#7A7E85` | `DEFAULT_LINE_COMMENT` |
| Javadoc | `#5F826B` italic, tags `#67A37C` underlined | `DEFAULT_DOC_COMMENT(_TAG)` |
| Method declaration | `#56A8F5` | `DEFAULT_FUNCTION_DECLARATION` |
| Field | `#C77DBB` (static: italic) | `DEFAULT_INSTANCE_FIELD`, `DEFAULT_STATIC_FIELD` |
| Static method call | `#57AAF7` italic | `DEFAULT_STATIC_METHOD` |
| Annotation | `#B3AE60` | `DEFAULT_METADATA` |
| Caret row | `#1F2024` | `CARET_ROW_COLOR` |
| Line numbers | `#4B5059`, current `#A1A3AB` | `LINE_NUMBERS_COLOR` |
| Selected editor tab | bg `#233558`, border `#2E4D89` | `EditorTabs.underlinedTabBackground/BorderColor` |
| Tree selection | `#2A4371` (unfocused `#33353B`) | `*.selectionBackground` |
| Accent | `#3871E1` | `ToolWindow.Button.selectedBackground` |

Full mapping lives in `web/src/theme/uiThemes.ts` and `web/src/theme/editorThemes.ts`.

## Metrics (New UI, default/non-compact)

Main toolbar 40px · stripes 40px wide with 30px buttons and 20px icons · tool window header 40px ·
tree rows 24px (`Tree.rowHeight`) · editor tabs row 40px · status bar ~30px · UI font Inter 13px ·
editor font JetBrains Mono 13px, line height ~1.5.

## IntelliJ keymap reference

[IntelliJ IDEA reference card (PDF)](https://resources.jetbrains.com/storage/products/intellij-idea/docs/IntelliJIDEA_ReferenceCard.pdf) — Windows/Linux defaults are what we implement.
