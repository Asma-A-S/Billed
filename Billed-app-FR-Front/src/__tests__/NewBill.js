/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee on NewBill page", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		Object.defineProperty(window, "localStorage", { value: localStorageMock });
		window.localStorage.setItem(
			"user",
			JSON.stringify({ type: "Employee", email: "a@a" })
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("When I am on newBill page", () => {
		test("Then mail icon in vertical layout should be highlighted", async () => {
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.NewBill);

			await waitFor(() => screen.getByTestId("icon-mail"));
			const mailIcon = screen.getByTestId("icon-mail");
			expect(mailIcon).toHaveClass("active-icon");
		});

		test("Then I upload a valid file", async () => {
			document.body.innerHTML = NewBillUI();
			const onNavigate = jest.fn();
			const newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const inputFile = screen.getByTestId("file");
			const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));
			inputFile.addEventListener("change", handleChangeFile);

			const file = new File(["dummy content"], "test.jpg", {
				type: "image/jpg",
			});
			userEvent.upload(inputFile, file);

			expect(inputFile.files[0].name).toBe("test.jpg");
			expect(handleChangeFile).toHaveBeenCalled();

			const { fileUrl, key } = await mockStore.bills().create();
			expect(fileUrl).toBe("https://localhost:3456/images/test.jpg");
			expect(key).toBe("1234");
		});

		test("FormData should append the correct file and email", async () => {
			document.body.innerHTML = NewBillUI();
			const onNavigate = jest.fn();
			const newBill = new NewBill({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const formData = new FormData();
			const appendSpy = jest.spyOn(formData, "append");
			window.FormData = jest.fn(() => formData);

			const file = new File(["dummy content"], "test.jpg", {
				type: "image/jpg",
			});
			const inputFile = screen.getByTestId("file");

			userEvent.upload(inputFile, file);
			await newBill.handleChangeFile({ target: inputFile });

			expect(appendSpy).toHaveBeenCalledWith("file", file);
			expect(appendSpy).toHaveBeenCalledWith(
				"email",
				JSON.parse(localStorage.getItem("user")).email
			);
		});

		test("Then an alert should be displayed for invalid file", async () => {
			document.body.innerHTML = NewBillUI();
			const newBill = new NewBill({
				document,
				onNavigate: jest.fn(),
				store: mockStore,
				localStorage: window.localStorage,
			});

			const invalidFile = new File(["dummy content"], "test.txt", {
				type: "text/plain",
			});
			const inputFile = screen.getByTestId("file");

			jest.spyOn(window, "alert").mockImplementation(() => {});

			userEvent.upload(inputFile, invalidFile);
			expect(window.alert).toHaveBeenCalledWith(
				"Le justificatif doit être au format jpeg, jpg ou png"
			);
		});
	});

	describe("When I submit the form", () => {
		let newBill;

		beforeEach(() => {
			document.body.innerHTML = NewBillUI();
			newBill = new NewBill({
				document,
				onNavigate: jest.fn(),
				store: mockStore,
				localStorage: window.localStorage,
			});
		});

		test("Then handleSubmit should be called", () => {
			const form = screen.getByTestId("form-new-bill");
			const handleSubmit = jest.fn(newBill.handleSubmit);
			form.addEventListener("submit", handleSubmit);
			fireEvent.submit(form);

			expect(handleSubmit).toHaveBeenCalledTimes(1);
		});

		test("Then it should navigate to Bills page on valid submission", async () => {
			fireEvent.change(screen.getByTestId("expense-type"), {
				target: { value: "Transports" },
			});
			fireEvent.change(screen.getByTestId("expense-name"), {
				target: { value: "Vol Paris-Londres" },
			});
			fireEvent.change(screen.getByTestId("datepicker"), {
				target: { value: "2022-08-11" },
			});
			fireEvent.change(screen.getByTestId("amount"), {
				target: { value: "300" },
			});
			fireEvent.change(screen.getByTestId("vat"), { target: { value: "70" } });
			fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });

			fireEvent.submit(screen.getByTestId("form-new-bill"));

			await waitFor(() =>
				expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"])
			);
		});
	});
});

//////////////////////////////////////////
/************************test integration post****************************/
//////////////////////////////////////////
describe("When I navigate to Dashboard employee", () => {
	describe("Given I am a user connected as Employee, and a user post a newBill", () => {
		Object.defineProperty(window, "localStorage", {
			value: localStorageMock,
		});
		test("Add a bill from mock API POST", async () => {
			const postSpy = jest.spyOn(mockStore, "bills");
			const bill = {
				id: "47qAXb6fIm2zOKkLzMro",
				vat: "80",
				fileUrl:
					"https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
				status: "pending",
				type: "Hôtel et logement",
				commentary: "séminaire billed",
				name: "encore",
				fileName: "preview-facture-free-201801-pdf-1.jpg",
				date: "2004-04-04",
				amount: 400,
				commentAdmin: "ok",
				email: "a@a",
				pct: 20,
			};
			// Simulation correcte de l'API avec mockResolvedValue pour l'appel réussi à create
			mockStore.bills.mockImplementationOnce(() => ({
				create: jest.fn().mockResolvedValue({
					billId: bill.id,
					fileUrl: bill.fileUrl,
					fileName: bill.fileName,
				}),
			}));

			await new Promise(process.nextTick); // Attendre la résolution de la promesse asynchrone

			const { billId, fileUrl, fileName } = await mockStore
				.bills()
				.create(bill);

			// Vérifier que le mock de la méthode POST a été appelé et que les données sont correctes
			expect(billId).toEqual(bill.id);
			expect(fileUrl).toEqual(bill.fileUrl);
			expect(fileName).toEqual(bill.fileName);
			const postBills = await mockStore.bills().update(bill);
			expect(postBills).toStrictEqual(bill);
		});
		describe("When an error occurs on API", () => {
			beforeEach(() => {
				window.localStorage.setItem(
					"user",
					JSON.stringify({
						type: "Employee",
					})
				);

				document.body.innerHTML = NewBillUI();
			});
			test("Add bills from an API and fails with 404 message error", async () => {
				const postSpy = jest.spyOn(console, "error");

				const mockStore = {
					bills: jest.fn(() => newBill.store),
					create: jest.fn(() => Promise.reject(new Error("404"))),
					update: jest.fn(() => Promise.reject(new Error("404"))),
				};
				const onNavigate = (pathname) => {
					document.body.innerHTML = ROUTES({ pathname });
				};
				const newBill = new NewBill({
					document,
					onNavigate,
					store: mockStore,
					localStorage,
				});

				// Submit form
				const form = screen.getByTestId("form-new-bill");
				const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
				form.addEventListener("submit", handleSubmit);

				fireEvent.submit(form);
				await new Promise(process.nextTick);
				expect(postSpy).toHaveBeenCalledWith(new Error("404"));
			});
			test("Add bills from an API and fails with 500 message error", async () => {
				const postSpy = jest.spyOn(console, "error");

				const mockStore = {
					bills: jest.fn(() => newBill.store),
					create: jest.fn(() => Promise.resolve({})),
					update: jest.fn(() => Promise.reject(new Error("500"))),
				};
				const onNavigate = (pathname) => {
					document.body.innerHTML = ROUTES({ pathname });
				};
				const newBill = new NewBill({
					document,
					onNavigate,
					store: mockStore,
					localStorage,
				});

				// Submit form
				const form = screen.getByTestId("form-new-bill");
				const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
				form.addEventListener("submit", handleSubmit);

				fireEvent.submit(form);
				await new Promise(process.nextTick);
				expect(postSpy).toHaveBeenCalledWith(new Error("500"));
			});
		});
	});
});
