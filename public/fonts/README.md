# Chinese PDF fonts

Noto Sans SC, downloaded from the official [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/notosanssc) on 2026-10-30, under the bundled SIL OFL license (`OFL.txt`). Reserved Font Name in the upstream license: Source.

These are full static instances of `NotoSansSC[wght].ttf`, generated at weights 400 and 700 with fontTools 4.68.0. No character subset was removed. Internal Noto Sans SC family naming is preserved. PDF output embeds only the used glyphs.

The two files total approximately 21.2 MB and load from the same origin only when creating a PDF. They are not needed for ordinary editing, HTML export or Markdown export. PDF uses Noto Sans SC for every theme to keep Chinese glyphs portable; HTML uses system fonts, including a serif preference in the editorial theme. Synthetic italic is not applied to PDF fonts.

To reproduce:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
for weight, name in [(400, 'Regular'), (700, 'Bold')]:
    font = TTFont('NotoSansSC[wght].ttf')
    instantiateVariableFont(font, {'wght': weight}, inplace=True)
    font.save(f'NotoSansSC-{name}.ttf')
```
