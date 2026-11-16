import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    /// Covers the app wherever financial data must not be shown: in the app switcher snapshot
    /// (while the app is inactive) and in a screen recording, AirPlay mirror or shared screen
    /// (while the screen is being captured). iOS cannot block a single screenshot.
    private var privacyCover: UIVisualEffectView?
    private var captureNotice: UILabel?
    private var isInactive = false
    private var captureObserver: NSObjectProtocol?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()
        watchScreenCapture()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        isInactive = true
        updatePrivacyCover()
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        isInactive = false
        updatePrivacyCover()
    }

    private var isScreenCaptured: Bool {
        guard let window = window else { return false }
        if #available(iOS 17.0, *) {
            return window.traitCollection.sceneCaptureState == .active
        }
        return window.windowScene?.screen.isCaptured ?? false
    }

    private func watchScreenCapture() {
        if #available(iOS 17.0, *) {
            _ = window?.registerForTraitChanges([UITraitSceneCaptureState.self]) { [weak self] (_: UIWindow, _: UITraitCollection) in
                self?.updatePrivacyCover()
            }
        } else {
            captureObserver = NotificationCenter.default.addObserver(
                forName: UIScreen.capturedDidChangeNotification, object: nil, queue: .main
            ) { [weak self] _ in
                self?.updatePrivacyCover()
            }
        }
        updatePrivacyCover()
    }

    private func updatePrivacyCover() {
        guard let window = window else { return }
        let captured = isScreenCaptured
        guard isInactive || captured else {
            privacyCover?.removeFromSuperview()
            privacyCover = nil
            captureNotice = nil
            return
        }
        if privacyCover == nil {
            let cover = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))
            cover.frame = window.bounds
            cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]

            let notice = UILabel()
            notice.text = "Ficium is hidden while the screen is being recorded or shared."
            notice.font = .preferredFont(forTextStyle: .headline)
            notice.adjustsFontForContentSizeCategory = true
            notice.textColor = .label
            notice.textAlignment = .center
            notice.numberOfLines = 0
            notice.translatesAutoresizingMaskIntoConstraints = false
            cover.contentView.addSubview(notice)
            NSLayoutConstraint.activate([
                notice.centerYAnchor.constraint(equalTo: cover.contentView.centerYAnchor),
                notice.leadingAnchor.constraint(equalTo: cover.contentView.leadingAnchor, constant: 32),
                notice.trailingAnchor.constraint(equalTo: cover.contentView.trailingAnchor, constant: -32)
            ])

            window.addSubview(cover)
            privacyCover = cover
            captureNotice = notice
        }
        // Say why the app is covered only when it is being captured; the switcher snapshot stays blank.
        captureNotice?.isHidden = !captured
        if let cover = privacyCover { window.bringSubviewToFront(cover) }
    }

    deinit {
        if let captureObserver = captureObserver { NotificationCenter.default.removeObserver(captureObserver) }
    }
}
