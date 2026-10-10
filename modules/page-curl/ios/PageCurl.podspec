Pod::Spec.new do |s|
  s.name           = 'PageCurl'
  s.version        = '1.0.0'
  s.summary        = 'Native page-curl spreads for Meno'
  s.description    = 'Hosts React pages in a UIPageViewController with the page-curl transition and a centre spine.'
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
