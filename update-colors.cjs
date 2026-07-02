const fs = require('fs');

let css = fs.readFileSync('src/style.css', 'utf8');

// Colors replacement
// Cyan -> Vibrant Orange (255, 107, 0)
css = css.replace(/0,\s*230,\s*255/g, '255, 107, 0');
css = css.replace(/#00e6ff/g, '#ff6b00');

// Magenta -> Warm Red/Pink (255, 51, 102)
css = css.replace(/224,\s*64,\s*251/g, '255, 51, 102');
css = css.replace(/#e040fb/g, '#ff3366');

// Green -> Gold/Yellow (255, 215, 0)
css = css.replace(/57,\s*255,\s*133/g, '255, 215, 0');
css = css.replace(/#39ff85/g, '#ffd700');

// Red -> Pure Red (255, 51, 51)
css = css.replace(/255,\s*76,\s*106/g, '255, 51, 51');
css = css.replace(/#ff4c6a/g, '#ff3333');

// Backgrounds
css = css.replace(/--bg-primary: #0a0e1a;/g, '--bg-primary: #1e110b;');
css = css.replace(/--bg-secondary: #111827;/g, '--bg-secondary: #2a1711;');
css = css.replace(/rgba\(17, 24, 39,/g, 'rgba(42, 23, 17,'); // card/glass
css = css.replace(/rgba\(15, 23, 42,/g, 'rgba(38, 17, 12,'); // rack-body

fs.writeFileSync('src/style.css', css);

let engine = fs.readFileSync('src/engine.js', 'utf8');
// Warm process colors
engine = engine.replace(/'hsla\(190, 95%, 60%, 0.85\)',/g, "'hsla(15, 95%, 60%, 0.85)',");
engine = engine.replace(/'hsla\(280, 85%, 65%, 0.85\)',/g, "'hsla(350, 85%, 65%, 0.85)',");
engine = engine.replace(/'hsla\(45, 95%, 60%, 0.85\)',/g, "'hsla(45, 95%, 60%, 0.85)',");
engine = engine.replace(/'hsla\(340, 85%, 60%, 0.85\)',/g, "'hsla(30, 85%, 60%, 0.85)',");
engine = engine.replace(/'hsla\(140, 80%, 50%, 0.85\)',/g, "'hsla(0, 80%, 60%, 0.85)',");
engine = engine.replace(/'hsla\(25, 95%, 60%, 0.85\)',/g, "'hsla(55, 95%, 60%, 0.85)',");
fs.writeFileSync('src/engine.js', engine);

let particles = fs.readFileSync('src/particles.js', 'utf8');
particles = particles.replace(/0,\s*230,\s*255/g, '255, 107, 0');
fs.writeFileSync('src/particles.js', particles);

console.log("Colors updated successfully.");
