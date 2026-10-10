import ExpoModulesCore
import UIKit

/// A two-page spread that turns with UIKit's page curl: the sheet bends from
/// wherever the finger takes hold of it and follows it across the spine.
///
/// The pages are this view's React children, in reading order, two to a
/// spread: the spread before the current one (if any), the current spread,
/// and the one after (if any). `current` is the index of the current
/// spread's left page. UIKit owns the turn; when one completes the view
/// reports how many spreads it moved (`onTurn`) and React answers by sliding
/// the window of children along, with a new `spreadKey`.
final class PageCurlView: ExpoView, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
  let onTurn = EventDispatcher()

  var current = 0
  var spreadKey = ""

  private let pager: UIPageViewController
  private var pages: [UIView] = []
  private var hosts: [ObjectIdentifier: PageHost] = [:]
  private var transitioning = false
  /// The `spreadKey` at the moment a turn completed. Until React answers
  /// with a different one, what UIKit shows is newer than React's children.
  private var turnedAtKey: String?
  private var reconcileQueued = false

  required init(appContext: AppContext? = nil) {
    pager = UIPageViewController(
      transitionStyle: .pageCurl,
      navigationOrientation: .horizontal,
      options: [.spineLocation: NSNumber(value: UIPageViewController.SpineLocation.mid.rawValue)]
    )
    super.init(appContext: appContext)
    pager.isDoubleSided = true
    pager.dataSource = self
    pager.delegate = self
    pager.view.backgroundColor = .clear
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      guard pager.parent != nil else { return }
      pager.willMove(toParent: nil)
      pager.view.removeFromSuperview()
      pager.removeFromParent()
    } else {
      setNeedsReconcile()
    }
  }

  /// Puts the pager on screen. UIKit refuses a mid-spine pager that appears
  /// without its two pages, so this waits until the first spread is set.
  private func installPager() {
    guard pager.parent == nil, window != nil, let parent = owningViewController() else { return }
    parent.addChild(pager)
    pager.view.frame = bounds
    addSubview(pager.view)
    pager.didMove(toParent: parent)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    pager.view.frame = bounds
  }

  private func owningViewController() -> UIViewController? {
    var responder: UIResponder? = next
    while let r = responder {
      if let controller = r as? UIViewController { return controller }
      responder = r.next
    }
    return nil
  }

  // MARK: Children

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    pages.insert(childComponentView, at: min(index, pages.count))
    host(for: childComponentView).attach()
    setNeedsReconcile()
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    // React Native asserts that an unmounted view has no superview. A view
    // that is only moving comes straight back through mount and keeps its
    // host, so UIKit goes on showing the same page.
    childComponentView.removeFromSuperview()
    pages.removeAll { $0 === childComponentView }
    setNeedsReconcile()
  }

  private func host(for page: UIView) -> PageHost {
    let id = ObjectIdentifier(page)
    if let existing = hosts[id] { return existing }
    let created = PageHost(page: page)
    hosts[id] = created
    return created
  }

  /// Brings UIKit in line with React after React changed something. Runs
  /// once per batch of mutations, and never in the middle of a turn.
  func setNeedsReconcile() {
    guard !reconcileQueued else { return }
    reconcileQueued = true
    DispatchQueue.main.async { [weak self] in
      self?.reconcileQueued = false
      self?.reconcile()
    }
  }

  private func reconcile() {
    guard !transitioning else { return }
    if let key = turnedAtKey {
      if key == spreadKey { return }
      turnedAtKey = nil
    }
    let live = Set(pages.map { ObjectIdentifier($0) })
    hosts = hosts.filter { live.contains($0.key) }
    guard current >= 0, pages.count >= current + 2 else { return }
    let wanted = [host(for: pages[current]), host(for: pages[current + 1])]
    let shown = pager.viewControllers ?? []
    if shown.count != 2 || shown[0] !== wanted[0] || shown[1] !== wanted[1] {
      pager.setViewControllers(wanted, direction: .forward, animated: false)
    }
    installPager()
  }

  // MARK: UIPageViewControllerDataSource

  private func index(of controller: UIViewController) -> Int? {
    guard let page = (controller as? PageHost)?.page else { return nil }
    return pages.firstIndex { $0 === page }
  }

  func pageViewController(
    _ pageViewController: UIPageViewController,
    viewControllerBefore viewController: UIViewController
  ) -> UIViewController? {
    guard let i = index(of: viewController), i > 0 else { return nil }
    return host(for: pages[i - 1])
  }

  func pageViewController(
    _ pageViewController: UIPageViewController,
    viewControllerAfter viewController: UIViewController
  ) -> UIViewController? {
    guard let i = index(of: viewController), i + 1 < pages.count else { return nil }
    return host(for: pages[i + 1])
  }

  // MARK: UIPageViewControllerDelegate

  func pageViewController(
    _ pageViewController: UIPageViewController,
    willTransitionTo pendingViewControllers: [UIViewController]
  ) {
    transitioning = true
  }

  func pageViewController(
    _ pageViewController: UIPageViewController,
    didFinishAnimating finished: Bool,
    previousViewControllers: [UIViewController],
    transitionCompleted completed: Bool
  ) {
    transitioning = false
    if completed, let left = pager.viewControllers?.first, let i = index(of: left) {
      let delta = (i - current) / 2
      if delta != 0 {
        turnedAtKey = spreadKey
        onTurn(["delta": delta])
        return
      }
    }
    // Anything React changed during the turn was held back; apply it now.
    setNeedsReconcile()
  }

  func pageViewController(
    _ pageViewController: UIPageViewController,
    spineLocationFor orientation: UIInterfaceOrientation
  ) -> UIPageViewController.SpineLocation {
    pager.isDoubleSided = true
    return .mid
  }
}

/// Wraps one React page for UIPageViewController.
private final class PageHost: UIViewController {
  private(set) weak var page: UIView?

  init(page: UIView) {
    self.page = page
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not supported")
  }

  /// Takes the page into this controller's view. React lays the page out at
  /// the origin, the size of one side of the spread.
  func attach() {
    guard let page, page.superview !== view else { return }
    view.addSubview(page)
  }
}
