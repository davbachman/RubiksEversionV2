Original prompt: Create a web app game that looks like you are in the center of a Rubik's cube. Two finger drag on the trackpad to rotate the cube around you. After rotating, the cube should snap to the nearest position so that a face of the cube is being viewed orthogonally. One finger swipe to the right should rotate the face you are looking at clockwise, and one finger swipe left should rotate counter-clockwise. The field of view should be set so that the face you are facing toward is entirely visible, as well as the first adjacent row of the neighboring faces, and a tiny bit of the second row. Put the title of the app in the top menu bar: "Rubik's Eversion".

Plan notes:
- Use Vite, TypeScript, Three.js, and Lucide.
- In browser terms, face turns use click-drag horizontal swipes; view rotation uses two-finger trackpad wheel input.
- Expose window.render_game_to_text() and window.advanceTime(ms) for automated verification.

Implementation notes:
- Added tested cube-state logic for 26 shell cubies, 54 stickers, legal face turns, scramble, undo, and solved-state checks.
- Added tested camera snap math with 24 orthogonal forward/up orientations.
- Built the Three.js inside-cube renderer, adaptive FOV, fixed menu bar, Lucide icon buttons, wheel-to-snap view rotation, and click-drag face turns.
- Browser verification artifacts are under output/web-game/. The latest desktop smoke screenshot is output/web-game/basic-latest/shot-0.png, and the adjusted mobile screenshot is output/web-game/mobile/mobile-fov-adjusted.png.

Verification notes:
- npm run test passed: 14 tests.
- npm run build passed.
- develop-web-game Playwright smoke run passed without console errors.
- Direct Playwright checks passed for wheel snapping, click-drag clockwise face turn, scramble, reset, and undo.

Iteration notes, 2026-06-04:
- Changed local controls so one-finger click-drag rotates the camera/view around the cube center and snaps to the nearest orthogonal face on release.
- Added support for Safari/WebKit-style trackpad twist gesture events to rotate the viewed face; horizontal wheel input remains as a browser-testable fallback because most browsers do not expose true trackpad rotation events.
- Widened the inside-cube FOV on desktop and portrait viewports.
- Verified locally with npm run test, npm run build, the develop-web-game smoke client, direct Playwright click-drag/twist checks, and desktop/mobile screenshots under output/web-game/iterate-*.
- Fixed reversed local rotation directions: rightward click-drag now snaps toward the right face, and positive twist rotation now maps to counter-clockwise face turns. Re-verified with npm run test, npm run build, and direct Playwright state/screenshot checks under output/web-game/reversed-fixed/.
- Moved the camera 0.62 units backward from its current viewing direction while keeping it inside the cube. `render_game_to_text()` now includes `cameraPosition`; front view reports `[0,0,-0.62]`, and right view reports `[-0.62,0,0]`. Re-verified with npm run test, npm run build, web-game smoke screenshots, and direct Playwright checks under output/web-game/camera-back*.
- Changed snapping to preserve camera roll: after one-finger drag, the forward vector snaps to the nearest face normal, but the view no longer rolls so the face sides become parallel to the screen. Verified with npm run test, npm run build, and direct Playwright diagonal-drag check under output/web-game/roll-preserve/.
- Moved the camera outside the cube at 2.35 units behind the viewed direction and hid the nearest wall/sticker face so the player sees back into the hollow cube without the outside wall occluding the view. Added text-state fields for `hiddenFaceNormal` and reduced rendered facelets. Re-verified with npm run test, npm run build, and Playwright screenshots under output/web-game/outside-camera-*.
- Re-tuned the outside-camera FOV to a more natural profile: 86 degrees on desktop, 98 degrees on square-ish screens, and 112 degrees on portrait screens. Verified desktop and mobile screenshots under output/web-game/fov-natural-*.
- Fixed face-turn corner clipping by making black wall backdrops non-depth-writing backgrounds rendered behind sticker meshes. Fixed sticker planes still depth-occlude rotating stickers, but the whole black wall no longer acts as an abrupt clipping mask. Verified mid-turn screenshots under output/web-game/face-turn-depth-fix/.
- Filleted sticker corners by replacing square sticker planes with a shared rounded-rectangle ShapeGeometry. Verified static and mid-turn screenshots under output/web-game/rounded-stickers/.
