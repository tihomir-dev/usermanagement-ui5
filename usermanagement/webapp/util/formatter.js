sap.ui.define([
    "sap/ui/core/format/NumberFormat"
], function (NumberFormat) {
    "use strict";

    return {

        formatDateFromISO: function(dateString) {
            if (!dateString) return "";
            
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    return "";
                }
                
                return date.toISOString();

            } catch (error) {
                console.error("Error formatting date:", error);
                return "";
            }
        },

        
    };
});

