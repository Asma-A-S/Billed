/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import {} from "../__mocks__/localStorage.js";

import router from "../app/Router.js";
describe("Given I am connected as an employee on NewBill Page", () => {
	beforeAll(() => {
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
		});
		window.localStorage.setItem(
			"user",
			JSON.stringify({
				type: "Employee",
			})
		);
		const root = document.createElement("div");
		root.setAttribute("id", "root");
		document.body.appendChild(root);
		router();
	});

	test("Then mail icon in vertical layout should be highlighted", async () => {
		window.onNavigate(ROUTES_PATH.NewBill);
		await waitFor(() => screen.getByTestId("icon-mail"));
		const mailIcon = screen.getByTestId("icon-mail");
		expect(mailIcon).toHaveClass("active-icon");
		//expect(Icon.classList.contains("active-icon")).toBe(true);
	});
	describe("When I upload a file", () => {
		let newBill;
		let inputFile;
		let mockStore;
		beforeAll(() => {
			document.body.innerHTML = NewBillUI();
			inputFile = screen.getByTestId("file");
			//initialser le mockstore
			mockStore = {
				bills: jest.fn(() => ({
					create: jest.fn(() => Promise.resolve({})),
					update: jest.fn(() => Promise.resolve({})),
				})),
			};

			//instancier newBill
			newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});
		});
		test("then the newBill should be constructed with correct parameters", () => {
			console.log("newBill", newBill);
			expect(newBill.document).toBe(document);
			expect(newBill.onNavigate).toBeInstanceOf(Function);
			expect(newBill.store).toBe(mockStore);
			expect(newBill.localStorage).toBe(window.localStorage);
		});
		test("Then It should accept only jpeg, jpg, png files extensions", () => {
			//jest.mock("../app/store", () => mockStore)
			const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
			inputFile.addEventListener("change", handleChangeFile);
			const file = new File(["file.jpg"], "file.jpg", {
				type: "image/jpg",
			});
			fireEvent.change(inputFile, {
				target: {
					files: [file],
				},
			});
			expect(handleChangeFile).toHaveBeenCalled();
			expect(inputFile.files[0].name).toBe("file.jpg");
		});

		test("should alert when file is invalid", () => {
			const file = new File(["file content"], "document.txt", {
				type: "text/plain",
			});
			jest.spyOn(window, "alert").mockImplementation(() => {});
			fireEvent.change(inputFile, { target: { files: [file] } });
			expect(window.alert).toHaveBeenCalledWith(
				"Le justificatif doit être au format jpeg, jpg ou png"
			);
		});
	});
});
//tester formdata has email, has file
//tester create,
//teste submit
