// One consistent neural voice for all overviews and parts. Versioned filenames
// keep browsers from replaying the old system-voice recordings from cache.
export const narrationVoice = {
  model: 'Kokoro-82M v1.0',
  id: 'af_heart',
  language: 'en-us',
  speed: 0.93,
  revision: 'heart-v1',
};

function clip(lesson, id, title, transcript) {
  return {
    title,
    src: `audio/${lesson}/${id}-${narrationVoice.revision}.m4a`,
    durationRange: id === 'assembly' ? [20, 35] : [10, 20],
    transcript,
  };
}

// Context keys match lessons.js and each model's userData.part IDs.
export const narrationClips = {
  engine: {
    assembly: clip('engine', 'assembly', 'Assembly overview',
      "Let's look inside a four-cylinder engine. Each cylinder has a piston that moves up and down. First, air and fuel go in. Next, the piston squeezes the mixture. A spark lights it, and the hot gases push the piston down. Then the used gases go out. The four pistons take turns pushing, helping the crankshaft keep turning. Pick a part and let's explore!"),
    piston: clip('engine', 'piston', 'Piston',
      'Meet the piston! It slides up and down inside a cylinder. When the fuel burns, hot gases push it down. The piston pushes a connecting rod, which helps turn the crankshaft. Watch how straight movement becomes a turning movement.'),
    rod: clip('engine', 'rod', 'Connecting rod',
      "This is the connecting rod. It joins a piston to the crankshaft. As the piston moves up and down, the rod tilts and pushes on the shaft. Its ends can turn, so the parts stay connected while they move."),
    crank: clip('engine', 'crank', 'Crankshaft',
      'This is the crankshaft. The connecting rods join it to the pistons. As the pistons move up and down, they push and pull on the rods, turning this shaft. All four pistons take turns helping it go around.'),
    intake: clip('engine', 'intake', 'Intake valve',
      "Think of the intake valve as a little door. It opens while the piston moves down, letting air and fuel into the cylinder. Then it closes, keeping the mixture inside so the piston can squeeze it. Timing makes everything work together."),
    exhaust: clip('engine', 'exhaust', 'Exhaust valve',
      "Here's the exhaust valve, the way out for used gases. After the power stroke, this valve opens. The piston rises and pushes the gases out of the cylinder. Then the valve closes, ready for the next round of the engine's cycle."),
    plug: clip('engine', 'plug', 'Spark plug',
      "This small part is the spark plug. Near the end of compression, it makes a tiny spark inside the cylinder. The spark lights the fuel and air mixture. The hot gases expand, pushing the piston down and giving the engine power."),
    cam: clip('engine', 'cam', 'Camshaft',
      "Look at the bumps along the camshaft. As it turns, those bumps help open the valves at the right time. The camshafts turn once for every two turns of the crankshaft. That keeps the engine's four steps in order."),
    block: clip('engine', 'block', 'Cylinder block',
      "The cylinder block is the engine's strong main body. It holds the cylinders in a row and helps keep the moving parts lined up. We've opened this model like a cutaway, so you can see the pistons working inside."),
  },
  earth: {
    assembly: clip('earth', 'assembly', 'Earth overview',
      "Let's travel beneath Earth's surface! This cutaway shows four main layers. The crust is the thin outer skin where we live. Under it lies the mantle, made of hot rock that can flow very slowly. Deeper down, the outer core is liquid metal. At the center, the inner core is solid. Pick a layer to take a closer look. These layers are much bigger than they look here!"),
    crust: clip('earth', 'crust', 'Crust',
      "This is Earth's crust, the thin, rocky skin around our planet. It includes the land and the ocean floor. Compared with the whole Earth, it's very thin. We've made it thicker in this model so you can see it clearly."),
    mantle: clip('earth', 'mantle', 'Mantle',
      "Under the crust is the mantle, a huge layer of hot rock. Most of it is solid, but over millions of years it can flow very slowly. Think of it as rock moving on a timescale far longer than a human lifetime."),
    outer: clip('earth', 'outer', 'Outer core',
      "Now we're deep inside Earth, at the outer core. This layer is liquid metal, mostly iron. The moving metal helps create Earth's magnetic field. That field reaches far into space, even though the movement that helps make it happens deep below our feet."),
    inner: clip('earth', 'inner', 'Inner core',
      "Right at Earth's center is the inner core. It's a solid ball made mostly of iron. It's very hot, but the enormous pressure keeps it solid. So the outer core is liquid, while this even deeper layer stays solid."),
  },
  telephone: {
    assembly: clip('telephone', 'assembly', 'Telephone overview',
      "How can a voice travel along a wire? Let's explore an early Bell telephone. Speaking makes a thin metal disc vibrate. Near a magnet and coil, that movement creates a changing electrical signal. The wire carries the signal to the other instrument. There, another disc vibrates and makes sound again. These two instruments turn sound into an electrical signal, then back into sound. Pick a part to follow the journey!"),
    mouth: clip('telephone', 'mouth', 'Mouthpiece',
      "Start here, at the mouthpiece. Its shape guides the sound of a voice toward the thin diaphragm inside. When this instrument receives a signal, the same opening lets sound come out. One end can be used for speaking or listening."),
    diaphragm: clip('telephone', 'diaphragm', 'Diaphragm',
      "This thin metal disc is called a diaphragm. When someone speaks, sound makes it vibrate back and forth. At the receiving instrument, the electrical signal makes another diaphragm move. Those tiny movements push the air and make sound again."),
    coil: clip('telephone', 'coil', 'Electromagnet',
      "Look at the wire wrapped around this metal core. It forms a coil. Movement of the diaphragm near the magnet helps create a changing electrical signal. At the other instrument, the signal changes the magnetic pull, making its diaphragm vibrate."),
    wire: clip('telephone', 'wire', 'Connecting wire',
      "This wire connects the two instruments. It carries a changing electrical signal, rather than carrying a voice as sound through the wire. The moving lights help you follow the signal's journey. At the far end, the signal becomes sound again."),
    base: clip('telephone', 'base', 'Wooden base',
      "This wooden base keeps the telephone's parts steady and lined up. The metal terminals on it connect the instrument to the circuit. Even a simple support matters: the diaphragm and magnet need to stay close together for the telephone to work."),
  },
  body: {
    assembly: clip('body', 'assembly', 'Human body overview',
      "Let's meet some of the parts working inside your body. Your skeleton gives you support and protects important organs. Your brain helps guide what your body does. Your lungs bring oxygen into your blood, and your heart pumps blood through a network of vessels. Watch the lungs expand and relax while the heart beats at its own rhythm. These parts work together all day. Pick one to explore!"),
    brain: clip('body', 'brain', 'Brain',
      "Meet your brain! It helps you think, remember, feel, and move. Messages travel between your brain and the rest of your body through nerves. It also helps adjust breathing, even when you're not thinking about it. That's a busy part of your body!"),
    lungs: clip('body', 'lungs', 'Lungs',
      "These are your lungs. When you breathe in, they expand as air comes in. Oxygen moves into your blood, and carbon dioxide moves out of it. When you breathe out, the lungs get smaller and that carbon dioxide leaves with the air."),
    heart: clip('body', 'heart', 'Heart',
      "Your heart is a strong muscle that works like a pump. It sends blood to the lungs to collect oxygen, then pumps oxygen-rich blood around your body. Each heartbeat helps keep that journey going, whether you're running, reading, or resting."),
    skeleton: clip('body', 'skeleton', 'Skeleton',
      "Your skeleton is the framework of bones inside your body. It gives you shape and support. Some bones protect important organs, like the ribs around your chest. Where bones meet, joints help you move. Muscles pull on bones to make those movements happen."),
    vessels: clip('body', 'vessels', 'Blood vessels',
      "Blood vessels are the tubes that carry blood around your body. Arteries carry blood away from the heart, and veins bring it back. Tiny vessels connect them along the way. Together, they help deliver oxygen and carry away things your body no longer needs."),
  },
};
