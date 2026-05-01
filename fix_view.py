content = open("app/(dashboard)/timetable/page.tsx", "r", encoding="utf-8-sig").read()
target = chr(39) + "DRAFT" + chr(39) + " | " + chr(39) + "PUBLISHED" + chr(62) + chr(40) + chr(39) + "PUBLISHED" + chr(41)
print("target:", repr(target))
if target in content:
    print("FOUND")
else:
    idx = content.find("viewStatus")
    print("NOT FOUND, context:", repr(content[idx:idx+120]))
