import AppKit

let output = CommandLine.arguments[1]
let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)

image.lockFocus()
NSColor.clear.setFill()
NSRect(origin: .zero, size: size).fill()

let shell = NSBezierPath(
  roundedRect: NSRect(x: 64, y: 64, width: 896, height: 896),
  xRadius: 208,
  yRadius: 208
)
NSColor(srgbRed: 0.055, green: 0.063, blue: 0.052, alpha: 1).setFill()
shell.fill()

let frame = NSBezierPath(
  roundedRect: NSRect(x: 104, y: 104, width: 816, height: 816),
  xRadius: 168,
  yRadius: 168
)
NSColor(srgbRed: 0.66, green: 1, blue: 0.38, alpha: 0.22).setStroke()
frame.lineWidth = 8
frame.stroke()

let ink = NSColor(srgbRed: 0.66, green: 1, blue: 0.38, alpha: 1)
let font = NSFont.monospacedSystemFont(ofSize: 250, weight: .black)
let text = "VIM" as NSString
let attributes: [NSAttributedString.Key: Any] = [
  .font: font,
  .foregroundColor: ink,
  .kern: -20,
]
let bounds = text.size(withAttributes: attributes)
text.draw(
  at: NSPoint(x: (1024 - bounds.width) / 2, y: (1024 - bounds.height) / 2 + 24),
  withAttributes: attributes
)

ink.withAlphaComponent(0.52).setFill()
NSBezierPath(
  roundedRect: NSRect(x: 768, y: 248, width: 70, height: 194),
  xRadius: 18,
  yRadius: 18
).fill()
image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let png = bitmap.representation(using: .png, properties: [:])
else { fatalError("Could not render icon") }

try png.write(to: URL(fileURLWithPath: output))
