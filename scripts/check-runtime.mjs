const [major = 0, minor = 0, patch = 0] = process.versions.node.split(".").map(Number);
const supported = major === 24 && (minor > 12 || (minor === 12 && patch >= 0));

if (!supported) {
  console.error(`PlanRepo requires Node >=24.12.0 <25; found ${process.versions.node}.`);
  process.exitCode = 1;
} else {
  console.log(`Using supported Node ${process.versions.node}.`);
}
