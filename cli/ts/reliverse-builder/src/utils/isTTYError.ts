export class IsTTYError extends Error {
	constructor(msg: string) {
		super(`Error: ${msg}`);
	}
}

// export class IsTTYError extends Error {
//   constructor(msg: string) {
//     super(msg);
//   }
// }
