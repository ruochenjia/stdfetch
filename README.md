# stdfetch
A full implementation of <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API">DOM fetch API</a> for Node.js

## Installation
```
npm install stdfetch
```
## Usage
```javascript
import { fetch } from "stdfetch";

const response = await fetch("https://example.com/file.txt");
console.log(await response.text());
```
<br />

```javascript
import { fetch, Request } from "stdfetch";

const response = await fetch(new Request("https://example.com/binary-file", {
	method: "GET",
	headers: {
		"User-Agent": ""
	}
}));

if (response.ok) {
	const headers = response.headers;
	const buffer = await response.arrayBuffer();
}
```
#### Fetch local file
```javascript
const response = await fetch("file:///directory/file.txt");
```
#### Fetch from data URL
```javascript
const response = await fetch("data:text/plain;base64,SGVsbG8gV29ybGQK");
```
#### Load JavaScript URL
```javascript
const response = await fetch("javascript:console.log('Hello World');");
```
