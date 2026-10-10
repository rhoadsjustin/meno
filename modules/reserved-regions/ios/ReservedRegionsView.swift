import ExpoModulesCore
import UIKit

/// An invisible, touch-transparent view that reports UIKit's reserved regions
/// for its own bounds. Mounted over the app root, its coordinate space is the
/// window's, so the frames it emits are directly usable by React layouts.
///
/// Regions change as an iPhone Duo folds, unfolds, rotates or enters Split
/// View. UIKit has no dedicated notification, but every one of those events
/// lays the view out again or changes the scene geometry, so both are hooked
/// and the result is de-duplicated before it reaches JavaScript.
final class ReservedRegionsView: ExpoView {
  let onRegionsChange = EventDispatcher()

  private var lastSignature: String?
  private var geometryObservation: NSKeyValueObservation?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
    isAccessibilityElement = false
    backgroundColor = .clear
    if #available(iOS 17.0, *) {
      registerForTraitChanges([UITraitHorizontalSizeClass.self, UITraitVerticalSizeClass.self]) {
        (view: ReservedRegionsView, _: UITraitCollection) in
        view.publish()
      }
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    geometryObservation = nil
    if let scene = window?.windowScene {
      geometryObservation = scene.observe(\.effectiveGeometry, options: [.new]) { [weak self] _, _ in
        DispatchQueue.main.async { self?.publish() }
      }
    }
    publish()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    publish()
  }

  private func publish() {
    let regions = currentRegions()
    let signature = regions.map { region in
      region.map { "\($0.key)=\($0.value)" }.sorted().joined(separator: ",")
    }.joined(separator: ";")
    guard signature != lastSignature else { return }
    lastSignature = signature
    onRegionsChange(["regions": regions])
  }

  private func currentRegions() -> [[String: Any]] {
    guard #available(iOS 27.1, *) else { return [] }
    var out: [[String: Any]] = []
    let kinds: [(UIView.ReservedRegion.Kind, String)] = [(.division, "division"), (.occlusion, "occlusion")]
    for (kind, name) in kinds {
      for region in reservedRegions(kind: kind, options: [.includeInactive]) {
        let frame = region.frame
        out.append([
          "kind": name,
          "x": frame.minX,
          "y": frame.minY,
          "width": frame.width,
          "height": frame.height,
          "active": region.isActive,
        ])
      }
    }
    return out
  }
}
