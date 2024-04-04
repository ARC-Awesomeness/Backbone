/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search'], function(record, search) {

    function execute(context) {
        // Search for invoices to process (will have box checked)
        var invoiceSearch = search.create({
            type: search.Type.INVOICE,
            filters: ['status', search.Operator.IS, 'Open'],
            columns: ['internalid']
        });
        log.debug('invoiceSearch', invoiceSearch);

        invoiceSearch.run().each(function(result) {
            var invoiceId = result.getValue({name: 'internalid'});
            processInvoice(invoiceId);
            return true;
        });
    }

    function processInvoice(invoiceId) {
        var invoice = record.load({
            type: record.Type.INVOICE,
            id: invoiceId,
            isDynamic: true
        });
        log.debug('invoice', invoice);

        // Retrieve invoice details
        var customerId = invoice.getValue({fieldId: 'entity'});
        log.debug('customerId', customerId);
        var invoiceDate = invoice.getValue({fieldId: 'trandate'});
        log.debug('invoiceDate', invoiceDate);
        var invoiceLines = invoice.getLineCount({sublistId: 'item'});
        log.debug('invoiceLines', invoiceLines);

        // Create a journal entry
        var journalEntry = record.create({
            type: record.Type.JOURNAL_ENTRY,
            isDynamic: true
        });
        log.debug('journalEntry', journalEntry);

        journalEntry.setValue({
            fieldId: 'trandate',
            value: invoiceDate
        });

        //account to undeposited funds
        journalEntry.setValue({
            fieldId: 'trandate',
            value: invoiceDate
        });

        journalEntry.setValue({
            fieldId: 'memo',
            value: 'Journal Entry created from Invoice #' + invoiceId
        });

        // Loop through invoice lines and create corresponding journal entry lines
        for (var i = 0; i < invoiceLines; i++) {
            var item = invoice.getSublistSubrecord({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
           // var accountId = item.getValue({fieldId: 'incomeaccount'});
            var amount = invoice.getSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: i
            });
            journalEntry.selectNewLine({sublistId: 'line'});
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: accountId
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: amount
            });
            journalEntry.commitLine({sublistId: 'line'});

            journalEntry.selectNewLine({sublistId: 'line'});
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: accountId
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: amount
            });
            journalEntry.commitLine({sublistId: 'line'});
        }

        var journalEntryId = journalEntry.save();
        log.debug('journalEntryId', journalEntryId);

        // Create a customer payment record
        //CAN TRANSFORM TOO

        var customerPayment = record.transform({
            fromType: record.Type.INVOICE,
            fromId: 107,
            toType: record.Type.CUSTOMER_PAYMENT,
            isDynamic: true,
        });
        log.debug('customerPayment', customerPayment);

        //or create it
        var customerPayment = record.create({
            type: record.Type.CUSTOMER_PAYMENT,
            isDynamic: true
        });

        customerPayment.setValue({
            fieldId: 'customer',
            value: customerId
        });

        customerPayment.setValue({
            fieldId: 'payment',
            value: invoice.getValue({fieldId: 'total'})
        });

        customerPayment.setValue({
            fieldId: 'paymentmethod',
            value: '1' // Assuming payment method ID
        });

        customerPayment.setValue({
            fieldId: 'trandate',
            value: invoiceDate
        });

        customerPayment.setValue({
            fieldId: 'autoapply',
            value: true
        });

        customerPayment.setValue({
            fieldId: 'invoice',
            value: invoiceId
        });

        //MAKE SURE AMOUNT IS SAME AS JE
        var customerPaymentId = customerPayment.save();

        log.debug({
            title: 'Journal Entry and Customer Payment Created',
            details: 'Journal Entry ID: ' + journalEntryId + ', Customer Payment ID: ' + customerPaymentId
        });
    }

    return {
        execute: execute
    };
});
