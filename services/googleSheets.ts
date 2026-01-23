
/**
 * FRONTEND SERVICE - WEB PORTAL SIDE
 */

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxlq3elWRe_l2DjSXcV_zejMCSCHvuMnWeYuvRkS_ZrAYxrCcDO-5iT14A-6SseuDM5aA/exec';

export const submitToGoogleSheets = async (order: any): Promise<boolean> => {
  try {
    if (!GOOGLE_SCRIPT_URL) return false;

    // Map each item in the order to a row (21 columns)
    const payload = order.items.map((item: any) => ({
      'Timestamp': new Date().toLocaleString('en-IN'),
      'Customer PO': order.customerPONo || 'N/A',
      'Customer Name': order.customer?.name || 'N/A',
      'Customer Email': order.customer?.email || 'N/A',
      'Order Date': order.orderDate,
      'Unit': item.category, 
      'Item Name': item.itemName,
      'Color': item.color || 'STD',
      'Width': item.width || 'STD',
      'Unit (of item)': item.uom,
      'Qty': item.quantity,
      'Rate': item.rate,
      'Discount': item.discount || 0,
      'Delivery Date': item.dispatchDate, // Mapped from renamed dispatchDate
      'Remark': item.remark || '',
      'Customer Number': order.customer?.contact_no || 'N/A',
      'Billing Address': order.billingAddress || 'N/A',
      'Delivery Address': order.deliveryAddress || 'N/A',
      'Transporter Name': item.transportName || 'N/A',
      'Sales Person Name': order.salesPerson,
      'Account Status': order.accountStatus || '', // Use dynamic value, no hardcoded "Active"
      'Branch': order.branch 
    }));

    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error('Google Sheets Submission Error:', error);
    return false;
  }
};
