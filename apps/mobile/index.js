// Entry shim for release builds in this monorepo: the Gradle bundle task
// relativizes the entry against react.root and Expo resolves it from its
// detected project root — a local file keeps both consistent.
import 'expo-router/entry';
