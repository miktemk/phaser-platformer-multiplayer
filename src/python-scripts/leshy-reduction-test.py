import re
from operator import itemgetter, attrgetter


def RoundAllDecimalNumbers(text):
    # LINK: https://regex101.com/r/NI2IY3/3
    listy = []
    matches = re.finditer(re.compile(r'\d+\.\d\d\d+'), text)
    for m in matches:
        numStr = m.group(0)
        replacement = "{0:0.0f}".format(float(numStr))
        listy += [(numStr, replacement, m.start(0))]
    listy = sorted(listy, key=itemgetter(2), reverse=True)
    for (numStr, replacement, start) in listy:
        text = text[:start] + replacement + text[start + len(numStr):]
    return text

def MultiplyAllNumbersInRegexGroups(text, regex, factor):
    listy = []
    matches = re.finditer(re.compile(regex), text)
    for m in matches:
        for iGroup in range(len(m.groups())):
            numStr = m.group(iGroup+1)
            num = float(numStr)
            num *= factor
            replacement = "{0:0.0f}".format(num)
            listy += [(numStr, replacement, m.start(iGroup+1))]
    listy = sorted(listy, key=itemgetter(2), reverse=True)
    for (numStr, replacement, start) in listy:
        text = text[:start] + replacement + text[start + len(numStr):]
    return text

text = """{"frames":{"attack1":{"frame":{"x":0,"y":0,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"attack2":{"frame":{"x":0,"y":819,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"attack3":{"frame":{"x":1207,"y":0,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"attack4":{"frame":{"x":1207,"y":819,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"attack5":{"frame":{"x":0,"y":1638,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"fly1":{"frame":{"x":1207,"y":1638,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"fly2":{"frame":{"x":0,"y":2457,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}},"idle":{"frame":{"x":1207,"y":2457,"w":1206,"h":818},"rotated":false,"trimmed":false,"spriteSourceSize":{"x":0,"y":0,"w":1206,"h":818},"sourceSize":{"w":1206,"h":818}}},"meta":{"app":"https://www.leshylabs.com/apps/sstool/","version":"Leshy SpriteSheet Tool v0.8.4","image":"ss-dragon.png","size":{"w":2413,"h":3275},"scale":1}}"""

widthBefore = 2413
widthAfter = 800
reductionFactor = float(widthAfter) / widthBefore
# LINK: https://regex101.com/r/Yj99Mo/1
text = MultiplyAllNumbersInRegexGroups(text, r'"x":(\d+),"y":(\d+),"w":(\d+),"h":(\d+)', reductionFactor)
# LINK: https://regex101.com/r/Yj99Mo/3
text = MultiplyAllNumbersInRegexGroups(text, r'{"w":(\d+),"h":(\d+)}', reductionFactor)
print(text)
