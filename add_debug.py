path = 'services/timetable.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '    const flat: ScheduledUnit[] = []\n    Object.values(d.grid ?? {}).forEach'
new = '    const flat: ScheduledUnit[] = []\n    console.log(\'GRID KEYS:\', Object.keys(d.grid ?? {}))\n    console.log(\'FIRST DAY:\', JSON.stringify(Object.values(d.grid ?? {})[0]))\n    Object.values(d.grid ?? {}).forEach'

count = c.count(old)
print('Occurrences:', count)
if count:
    c = c.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Done')
else:
    print('MISS - searching for flat:')
    idx = c.find('const flat')
    print(repr(c[idx:idx+100]))
