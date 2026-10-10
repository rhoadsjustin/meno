Pod::Spec.new do |s|
  s.name           = 'ReservedRegions'
  s.version        = '1.0.0'
  s.summary        = 'Reserved display regions (iPhone Duo fold and cameras) for Meno'
  s.description    = 'Reports UIKit reserved regions (iOS 27.1+) to React Native as window-relative rects.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
