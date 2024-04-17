/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search'], function(record, search) {

    function execute(context) {
        // Search for invoices to process (will have box checked)- custbody_cbiz_bac_dm_reversal
        var invoiceSearch = search.load({ id: "customsearch_importinvoice_reversal_ss"});
        log.debug('invoiceSearch', invoiceSearch);

        // Run the search and process the results

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
        var tranid = invoice.getValue({fieldId: 'tranid'});  //invoice number
        log.debug('tranid', tranid);
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
      
         journalEntry.setValue({
            fieldId: 'subsidiary',
            value: 3 //backbone labs
        });

       journalEntry.setValue({
            fieldId: 'approvalstatus',
            value: 2
        });

        journalEntry.setValue({
            fieldId: 'memo',
            value: 'Journal Entry created from Invoice #' + invoiceId
        });

      var jeNum = journalEntry.getValue({
       fieldId: 'tranid'
      });
      log.debug('jeNum', jeNum);

        //run search for accounts an amounts here
        var mySearch2 = search.load({ id: "customsearch_importinvoice_reversal_ss_2"});
        log.debug('mySearch2', mySearch2);
                var filterArray = [];
                filterArray.push(['internalid','is', invoiceId]);
                mySearch2.filterExpression = filterArray;
                var filters = mySearch2.filterExpression;
                // Run the search2 with filter fom ss1 
                var Results2 = mySearch2.run().getRange(0, 999);
                log.debug('Search Results 2', Results2);
                log.debug('Search Results 2 length', Results2.length);

                for (var x = 0; x < 2; x++) {  //Results2.length
                   log.debug('x', x);
                    // Retrieve account and amount from the search result
                  var account = Results2[x].getValue({
                        name: 'account',
                    });
                    log.debug('account', account);
                  
                  var creditamount = Results2[x].getValue({
                        name: 'creditamount',
                    });
                    log.debug('creditamount', creditamount);
                  
                  var debitamount = Results2[x].getValue({
                        name: 'debitamount',
                    });
                    log.debug('debitamount', debitamount);
                  
                  var loc = Results2[x].getValue({
                        name: 'location',
                    });
                    log.debug('loc', loc);
                  
                  var entity = Results2[x].getValue({
                        name: 'entity',
                    });
                    log.debug('entity', entity);
                
              
        // Loop through invoice lines and create corresponding journal entry lines

        if(x==0){
        log.debug('x=0');
            journalEntry.selectNewLine({sublistId: 'line'});
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: account
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: debitamount
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: 0
            });
             journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'location',
                value: loc
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'entity',
                value: entity
            });
            journalEntry.commitLine({sublistId: 'line'});
                  }
      if(x==1){
      log.debug('x=1');
            journalEntry.selectNewLine({sublistId: 'line'});
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'account',
                value: account
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'debit',
                value: creditamount
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                value: 0
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'location',
                value: loc
            });
            journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'entity',
                value: entity
            });
            journalEntry.commitLine({sublistId: 'line'});
      }
                }

        var journalEntryId = journalEntry.save();
        log.debug('journalEntryId', journalEntryId);


      //set flag to false
      invoice.setValue({
            fieldId: 'custbody_cbiz_bac_dm_reversal',
            value: false
        });
        invoice.save();

      log.debug('checkbox set to false once processed');

        //Create a customer payment record
        //CAN TRANSFORM TOO

      /*  var customerPayment = record.transform({
            fromType: record.Type.INVOICE,
            fromId: invoiceId,
            toType: record.Type.CUSTOMER_PAYMENT,
            isDynamic: false
        });
*/
        
      var customerPayment = record.create({
      type: record.Type.CUSTOMER_PAYMENT,
      isDynamic: true
      });
     
      log.debug('customerPayment', customerPayment);

        customerPayment.setValue({
            fieldId: 'customer',
            value: customerId
        });

      log.debug('set customer');

       // customerPayment.setValue({
        //    fieldId: 'trandate',
       //     value: invoiceDate
      //  });

       // customerPayment.setValue({
       //     fieldId: 'payment',
       //     value: 0
      //  });

        var lineCount = customerPayment.getLineCount({
                sublistId: 'credit'
            });
            log.debug("lineCount", lineCount);
            

       for (var i = 0; i < lineCount; i++) {
                var refnum = customerPayment.getSublistValue({
                    sublistId: 'credit',
                    fieldId: 'refnum',
                    line: i
                });
                log.debug("refnum", refnum);

         if(refnum == jeNum){
         log.debug("je match found");

/*customerPayment.setSublistValue({
    sublistId: 'credit',
    fieldId: 'apply',
    line: i,
    value: true
});*/
            customerPayment.selectLine({
    sublistId: 'credit',
    line: i
});
   customerPayment.setCurrentSublistValue({
    sublistId: 'credit',
    fieldId: 'apply',
    value: true
  });

customerPayment.commitLine({
    sublistId: 'credit'
});
 log.debug("here");
         }
       }
        var lineCount = customerPayment.getLineCount({
                sublistId: 'apply'
            });
            log.debug("lineCount", lineCount);   

        for (var i = 0; i < lineCount; i++) {

        var refnum2 = customerPayment.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'refnum',
                    line: i
                });
                log.debug("refnum2", refnum2);

        if( refnum2 == tranid ){
         log.debug("inv match found");

/*customerPayment.setSublistValue({
    sublistId: 'apply',
    fieldId: 'apply',
    line: i,
    value: true
});
*/

  customerPayment.selectLine({
    sublistId: 'apply',
    line: i
});
   customerPayment.setCurrentSublistValue({
    sublistId: 'apply',
    fieldId: 'apply',
    value: true
  });

customerPayment.commitLine({
    sublistId: 'apply'
});
 log.debug("here");
         }
        }
    /*       
  customerPayment.selectLine({
    sublistId: 'credit',
    line: i
});
   customerPayment.setCurrentSublistValue({
    sublistId: 'credit',
    fieldId: 'apply',
    value: true
  });

customerPayment.commitLine({
    sublistId: 'item'
});
 log.debug("here");

       */

        //customerPayment.setValue({
       //     fieldId: 'paymentmethod',
       //     value: '1' // Assuming payment method ID
      //  });

      //  customerPayment.setValue({
       //     fieldId: 'autoapply',
       //     value: true
     //   });

       // customerPayment.setValue({
       //     fieldId: 'invoice',
       //     value: invoiceId
       // });
           

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
