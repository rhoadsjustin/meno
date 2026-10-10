import ExpoModulesCore
import UIKit

/// An invisible, touch-transparent view that reports UIKit's reserved regions
/// for its own bounds. Mounted over the app root, its coordinate space is the
/// window's, so the frames it emits are directly usable by React layouts.
///
/// Regions change as an iPhone Duo folds, unfolds, rotates or enters Split
/// View. UIKit has no dedicated notification: rotation and Split View lay the
/// view out again and change the scene geometry, but a hinge change at the
/// same orientation can do neither, so a light poll (while the app is active)
/// backs up the layout and geometry hooks. Results are de-duplicated before
/// they reach JavaScript, so the poll is silent unless something moved.
final class ReservedRegionsView: ExpoView {
  let onRegionsChange = EventDispatcher()

  private var lastSignature: String?
  private var geometryObservation: NSKeyValueObservation?
  private var poll: Timer?
  private var lifecycleObservers: [NSObjectProtocol] = []

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
    let center = NotificationCenter.default
    lifecycleObservers = [
      center.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
        self?.startPolling()
        self?.publish()
      },
      center.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
        self?.stopPolling()
      },
    ]
  }

  deinit {
    poll?.invalidate()
    lifecycleObservers.forEach(NotificationCenter.default.removeObserver)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    geometryObservation = nil
    if let scene = window?.windowScene {
      geometryObservation = scene.observe(\.effectiveGeometry, options: [.new]) { [weak self] _, _ in
        DispatchQueue.main.async { self?.publish() }
      }
      startPolling()
    } else {
      stopPolling()
    }
    publish()
  }

  /// Re-queries a few times a second while on screen. Cheap: the query is a
  /// handful of rects, and nothing is sent unless they changed.
  private func startPolling() {
    guard poll == nil, window != nil else { return }
    if #available(iOS 27.1, *) {
      poll = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] _ in
        self?.publish()
      }
    }
  }

  private func stopPolling() {
    poll?.invalidate()
    poll = nil
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
