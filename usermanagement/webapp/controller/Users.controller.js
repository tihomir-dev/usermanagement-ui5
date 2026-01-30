sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService"
], (Controller, JSONModel, MessageToast, UserService) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Users", {

        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this.oRouter = this.getOwnerComponent().getRouter();

            var allUsersModel = new JSONModel({
                users: [],
                total: 0,
                count: 0
            });

            var oOptionsModel = new JSONModel({
                statuses: [
                    { key: "ACTIVE", text: oResourceBundle.getText("activeStatus") },
                    { key: "INACTIVE", text: oResourceBundle.getText("inactiveStatus") }
                ],
                userTypes: [
                    { key: "employee", text: oResourceBundle.getText("employeeItem") },
                    { key: "customer", text: oResourceBundle.getText("customerItem") },
                    { key: "partner", text: oResourceBundle.getText("partnerItem") },
                    { key: "external", text: oResourceBundle.getText("externalEmployeeItem") },
                    { key: "onboardee", text: oResourceBundle.getText("onboardeeItem") }
                ],
                countries: [
                    { code: "BG", name: "Bulgaria" },
                    { code: "DE", name: "Germany" },
                    { code: "US", name: "United States" },
                    { code: "FR", name: "France" },
                    { code: "IT", name: "Italy" },
                    { code: "ES", name: "Spain" },
                    { code: "GB", name: "United Kingdom" }
                ]
            });

            this.getView().setModel(allUsersModel, "allUsersModel");
            this.getView().setModel(oOptionsModel, "options");
            this.loadAllUsers();
            sap.ui.getCore().getEventBus().subscribe("UserChannel", "ReloadUsers", function () {
                this.loadAllUsers("");
            }.bind(this));
            sap.ui.getCore().getEventBus().subscribe("FiltersChannel", "ResetFilters", this.onResetFilters, this);



        },

        loadAllUsers: async function (queryString) {
            queryString = queryString || "";  // Default to empty string if not provided
            try {
                var allUsersModel = this.getView().getModel("allUsersModel");
                var oView = this.getView();
                oView.setBusy(true);

                var response = await fetch(`/api/users${queryString}`);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const dbResponse = await response.json();

                allUsersModel.setProperty("/users", dbResponse.items);
                allUsersModel.setProperty("/total", dbResponse.total);
                allUsersModel.setProperty("/count", dbResponse.count);
                oView.setBusy(false);
            } catch (error) {
                console.error("Couldn't retrieve users:", error);
                MessageToast.show("Error loading users");
                this.getView().setBusy(false);
            }
        },


        onSearch: function (oEvent) {
            this.applyFilters();
        },

        onListItemPress: async function (oEvent) {
            try {
                const oSelectedItem = oEvent.getParameter("listItem");
                const oCtx = oSelectedItem.getBindingContext("allUsersModel");
                const userId = oCtx.getProperty("ID");


                this.oRouter.navTo("userDetail", {
                    userId: userId,
                    layout: "TwoColumnsBeginExpanded"
                });
            } catch (error) {
                console.error("Error navigating to user detail:", error);
                MessageToast.show("Error opening user details");
            }
        },

        onCreate: function () {

            this.oRouter.navTo("userCreate");
        },
        onCountryValueHelp: function (oEvent) {
            var oView = this.getView();
            var oInput = oEvent.getSource();

            if (!this._oCountryDialog) {
                this._oCountryDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.CountriesDialog",
                    this
                );
                oView.addDependent(this._oCountryDialog);
            }

            this._oCountryInput = oInput;
            this._oCountryDialog.open();
        },
        onCountryValueHelpClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");

            if (oSelectedItem) {
                var oCtx = oSelectedItem.getBindingContext("options");
                var selectedCountry = oCtx.getObject();

                this._oCountryInput.setValue(selectedCountry.code);
                this.applyFilters();
            }

            this._oCountryDialog.close();
        },
        onCountrySearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        onStatusFilterChange: function (oEvent) {
            this.applyFilters();
        },
        onUserTypeFilterChange: function (oEvent) {
            this.applyFilters();
        },
        applyFilters: function () {
            var statusCombo = this.getView().byId("statusFilterCombo");
            var userTypeCombo = this.getView().byId("userTypeFilterCombo");
            var countryInput = this.getView().byId("countryFilterInput");
            var searchField = this.getView().byId("userSearchField");

            var search = searchField.getValue();
            var status = statusCombo.getSelectedKey();
            var userType = userTypeCombo.getSelectedKey();
            var country = countryInput.getValue();


            var queryParams = [];
            if (search) queryParams.push("search=" + encodeURIComponent(search));
            if (status) queryParams.push("status=" + encodeURIComponent(status));
            if (userType) queryParams.push("userType=" + encodeURIComponent(userType));
            if (country) queryParams.push("country=" + encodeURIComponent(country));

            var queryString = queryParams.length > 0 ? "?" + queryParams.join("&") : "";

            this.loadAllUsers(queryString);
        },
        onCountryInputChange: function (oEvent) {
            this.applyFilters();
        },
        onSearchLiveChange: function (oEvent) {

            if (this._searchTimeout) {
                clearTimeout(this._searchTimeout);
            }

            this._searchTimeout = setTimeout(() => {
                this.applyFilters();
            }, 300);
        },
        onResetFilters: function () {

            this.getView().byId("userSearchField").setValue("");
            this.getView().byId("statusFilterCombo").setSelectedKey("");
            this.getView().byId("userTypeFilterCombo").setSelectedKey("");
            this.getView().byId("countryFilterInput").setValue("");

            this.loadAllUsers("");
        },
        onCreate: function () {
            var oView = this.getView();

            if (!this._oCreateUserDialog) {
                this._oCreateUserDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.CreateUserDialog",
                    this
                );
                oView.addDependent(this._oCreateUserDialog);
            }

            // Initialize empty model for new user
            var createUserModel = new JSONModel({
                firstName: "",
                lastName: "",
                loginName: "",
                email: "",
                userType: "",
                status: "ACTIVE",
                company: "",
                country: "",
                city: "",
                validFrom: null,
                validTo: null
            });

            this.getView().setModel(createUserModel, "createUserModel");
            this._oCreateUserDialog.open();
        },
        onCreateUserSave: async function () {
            var createUserModel = this.getView().getModel("createUserModel");
            var userData = createUserModel.getData();
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            // Validate required fields
            if (!userData.firstName || !userData.lastName || !userData.loginName || !userData.email || !userData.userType || !userData.status) {
                MessageToast.show(oResourceBundle.getText("requiredFieldsError"));
                return;
            }

            try {
                // Format dates for SCIM
                var validFromDate = userData.validFrom ? this._formatDateForSCIM(userData.validFrom) : null;
                var validToDate = userData.validTo ? this._formatDateForSCIM(userData.validTo) : null;

                var createData = {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    loginName: userData.loginName,
                    email: userData.email,
                    userType: userData.userType,
                    status: "ACTIVE",
                    company: userData.company,
                    country: userData.country,
                    city: userData.city,
                    validFrom: validFromDate,
                    validTo: validToDate
                };

                var response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(createData)
                });

                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }

                MessageToast.show(oResourceBundle.getText("userCreatedSuccess"));
                this._oCreateUserDialog.close();
                this._oCreateUserDialog.destroy();
                this._oCreateUserDialog = null;
                this.loadAllUsers("");

            } catch (error) {
                console.error("Error creating user:", error);
                MessageToast.show(oResourceBundle.getText("userCreateError"));
            }
        },

        onCreateUserCancel: function () {
            this._oCreateUserDialog.close();
            this._oCreateUserDialog.destroy();
            this._oCreateUserDialog = null;
        },
        _formatDateForSCIM: function (dateValue) {
            if (!dateValue) return null;

            try {
                var date;

                // Handle string date values
                if (typeof dateValue === 'string') {
                    date = new Date(dateValue);
                } else if (dateValue instanceof Date) {
                    date = dateValue;
                } else {
                    console.warn("Invalid date type:", typeof dateValue);
                    return null;
                }

                // Validate the date
                if (isNaN(date.getTime())) {
                    console.warn("Invalid date value:", dateValue);
                    return null;
                }

                // Use UTC methods to ensure consistent timezone
                var year = date.getUTCFullYear();
                var month = String(date.getUTCMonth() + 1).padStart(2, '0');
                var day = String(date.getUTCDate()).padStart(2, '0');
                var hours = String(date.getUTCHours()).padStart(2, '0');
                var minutes = String(date.getUTCMinutes()).padStart(2, '0');
                var seconds = String(date.getUTCSeconds()).padStart(2, '0');

                // Format: YYYY-MM-DDTHH:mm:ssZ (matches IAS response format)
                var formattedDate = year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "Z";

                console.log("Formatted date:", dateValue, "=>", formattedDate);

                return formattedDate;
            } catch (error) {
                console.error("Error formatting date:", error);
                return null;
            }
        },
    });
});