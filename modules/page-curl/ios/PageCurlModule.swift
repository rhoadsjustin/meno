import ExpoModulesCore

public class PageCurlModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PageCurl")

    View(PageCurlView.self) {
      Events("onTurn")

      Prop("current") { (view: PageCurlView, value: Int) in
        view.current = value
      }
      Prop("spreadKey") { (view: PageCurlView, value: String) in
        view.spreadKey = value
      }
      OnViewDidUpdateProps { (view: PageCurlView) in
        view.setNeedsReconcile()
      }
    }
  }
}
