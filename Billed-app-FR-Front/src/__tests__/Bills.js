/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { bills } from "../fixtures/bills.js";
import { formatStatus } from "../app/format.js";
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);
describe("Given I am a user connected as Employee", () => {
	describe("When I call getBills and there is an error in the data formatting", () => {
		test("Then it should catch the error and return unformatted data", async () => {
			// Mock localStorage
			Object.defineProperty(window, "localStorage", {
				value: localStorageMock,
			});
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);

			const onNavigate = jest.fn();
			const bill = new Bills({
				document,
				onNavigate,
				store: mockStore, // Mock store
				localStorage: window.localStorage,
			});

			mockStore.bills = jest.fn(() => ({
				list: jest.fn(() => Promise.resolve(bills)),
			}));

			// Spy on the console.log to verify it catches the error
			const consoleSpy = jest.spyOn(console, "log");

			const result = await bill.getBills();

			expect(consoleSpy).toHaveBeenCalledWith("length", bills.length);

			const expectedResult = bills.map((bill) => ({
				...bill,
				date: bill.date,
				status: formatStatus(bill.status),
			}));

			expect(result).toEqual(expectedResult);

			consoleSpy.mockRestore(); // Restore original console.log behavior
		});
	});
});
describe("Given I am connected as an employee", () => {
	describe("When I am on Bills Page", () => {
		test("Then bill icon in vertical layout should be highlighted", async () => {
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
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			await waitFor(() => screen.getByTestId("icon-window"));
			const windowIcon = screen.getByTestId("icon-window");
			//to-do write expect expression
			expect(windowIcon).toHaveClass("active-icon");
		});
		test("Then bills should be ordered from earliest to latest", () => {
			document.body.innerHTML = BillsUI({ data: bills });
			const dates = screen
				.getAllByText(
					/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
				)
				.map((a) => a.innerHTML);
			const antiChrono = (a, b) => (a < b ? 1 : -1);
			const datesSorted = [...dates].sort(antiChrono);
			expect(dates).toEqual(datesSorted);
		});

		test("it should set up event listeners", () => {
			const onNavigate = jest.fn();

			document.body.innerHTML = `<button data-testid="btn-new-bill"></button>`;

			const bill = new Bills({
				document: document,
				onNavigate: onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const buttonNewBill = screen.getByTestId("btn-new-bill");
			expect(buttonNewBill).toBeTruthy();
			buttonNewBill.click();
			expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
		});
	});
});
describe("When I am on Bill page and I click on the icon eye", () => {
	test("then a modal should open", () => {
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
		});
		window.localStorage.setItem(
			"user",
			JSON.stringify({
				type: "Employee",
			})
		);
		document.body.innerHTML = BillsUI({ data: bills });

		const onNavigate = (pathname) => {
			document.body.innerHTML = ROUTES({ pathname });
		};
		const bill = new Bills({
			document,
			onNavigate,
			store: mockStore,
			localStorage: window.localStorage,
		});

		const modale = document.getElementById("modaleFile");
		$.fn.modal = jest.fn(() => modale.classList.add("show"));
		const handleClickIconEye = jest.fn(bills.handleClickIconEye);
		const eye = screen.getAllByTestId("icon-eye")[0];
		eye.addEventListener("click", handleClickIconEye);
		userEvent.click(eye);
		expect(handleClickIconEye).toHaveBeenCalled();

		expect(modale).toBeTruthy();
	});
});
///////////**********test integration*************/////////////

describe("Given I am a user connected as emploee", () => {
	describe("When I navigate to Bills", () => {
		test("Then fetches Bills from mock API get", async () => {
			localStorage.setItem(
				"user",
				JSON.stringify({ type: "Employee", email: "a@a" })
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			expect(screen.getAllByText("Billed")).toBeTruthy();
			expect(await waitFor(() => screen.getByText("Mes notes de frais")));
			expect(screen.getByTestId("tbody")).toBeTruthy();
			expect(screen.getAllByText("test1")).toBeTruthy();
			expect(screen.getAllByText("test2")).toBeTruthy();
			expect(screen.getAllByText("test3")).toBeTruthy();
			expect(screen.getAllByText("encore")).toBeTruthy();
		});
		describe("When an error occurs on API", () => {
			beforeEach(() => {
				jest.spyOn(mockStore, "bills");
				Object.defineProperty(window, "localStorage", {
					value: localStorageMock,
				});
				window.localStorage.setItem(
					"user",
					JSON.stringify({
						type: "Employee",
						email: "a@a",
					})
				);
				const root = document.createElement("div");
				root.setAttribute("id", "root");
				document.body.appendChild(root);
				router();
			});
			test("fetches bills from an API and fails with 404 message error", async () => {
				mockStore.bills.mockImplementationOnce(() => {
					return {
						list: () => {
							return Promise.reject(new Error("Erreur 404"));
						},
					};
				});
				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);
				const message = await screen.getByText(/Erreur 404/);
				expect(message).toBeTruthy();
			});

			test("fetches messages from an API and fails with 500 message error", async () => {
				mockStore.bills.mockImplementationOnce(() => {
					return {
						list: () => {
							return Promise.reject(new Error("Erreur 500"));
						},
					};
				});

				window.onNavigate(ROUTES_PATH.Bills);
				await new Promise(process.nextTick);
				const message = await screen.getByText(/Erreur 500/);
				expect(message).toBeTruthy();
			});
		});
	});
});
