import qz from "qz-tray";

export async function testQZ() {
  try {
    await qz.websocket.connect();

    console.log("QZ Connected");

    const printers = await qz.printers.find();

    console.log("Printers:", printers);

  } catch (err) {
    console.error("QZ Error:", err);
  }
}