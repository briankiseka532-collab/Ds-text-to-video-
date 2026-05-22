export default async function handler(req, res) {
  console.log("Test endpoint called");
  return res.status(200).json({ message: "Test OK" });
}
