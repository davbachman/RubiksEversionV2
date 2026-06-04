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
