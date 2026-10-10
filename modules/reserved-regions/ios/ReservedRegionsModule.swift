import ExpoModulesCore

public class ReservedRegionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReservedRegions")

    // UIKit reports reserved regions from iOS 27.1 (the iPhone Duo release).
    Constant("isSupported") {
      if #available(iOS 27.1, *) { return true }
      return false
    }

    View(ReservedRegionsView.self) {
      Events("onRegionsChange")
    }
  }
}
