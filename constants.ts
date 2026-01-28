
export const BRANCHES = [
  'Ahmedabad', 'Banglore', 'Delhi', 'Jaipur', 'Kolkata', 'Ludhiana', 'Mumbai', 'Surat', 'Tirupur', 'Ulhasnagar'
].sort();

// Mapping branches to their respective head emails for approvals as provided
export const BRANCH_CONFIG: Record<string, { headEmail: string, headName: string }> = {
  Ahmedabad: { headEmail: 'ahmedabad@ginzalimited.com', headName: 'Ravindra kaushik' },
  Banglore: { headEmail: 'murali.krishna@ginzalimited.com', headName: 'Murali Krishna' },
  Delhi: { headEmail: 'vinay.chhajer@ginzalimited.com', headName: 'Vinay Chhajer' },
  Jaipur: { headEmail: 'admin@ginzalimited.com', headName: 'Branch Head' }, 
  Kolkata: { headEmail: 'vishalambhore@ginzalimited.com', headName: 'Vishal Amhore' },
  Ludhiana: { headEmail: 'admin@ginzalimited.com', headName: 'Branch Head' },
  Mumbai: { headEmail: 'crm.mumbai@ginzalimited.com', headName: 'Saskhi' },
  Surat: { headEmail: 'piyush.baid@ginzalimited.com', headName: 'Piyush Baid' },
  Tirupur: { headEmail: 'tirupur@ginzalimited.com', headName: 'Ravi Varman' },
  Ulhasnagar: { headEmail: 'sachin.bhosle@ginzalimited.com', headName: 'Sachin Bhosale' }
};

export const BRANCH_SALES_PERSONS: Record<string, string[]> = {
  Mumbai: ['Amit Korgaonkar', 'Santosh Pachratkar', 'Rakesh Jain', 'Kamlesh Sutar', 'Pradeep Jadhav', 'Mumbai HO'],
  Ulhasnagar: ['Shiv Ratan', 'Viay Sutar', 'Ulasnagar HO'],
  Kolkata: ['Rajesh Jain', 'Kolkata HO'],
  Jaipur: ['Durgesh Bhati', 'Jaipur HO'],
  Delhi: ['Lalit Maroo', 'Anish Jain', 'Suresh Nautiyal', 'Rahul Vashishtha', 'Mohit Sharma', 'Delhi HO'],
  Banglore: ['Balasubramanyam', 'Tarachand', 'Bangalore HO'],
  Tirupur: ['Alexander Pushkin', 'Subramanian', 'Mani Maran', 'Tirupur HO'],
  Ahmedabad: ['ravindra kaushik', 'Ahmedabad HO'],
  Surat: ['Anil Marthe', 'Raghuveer Darbar', 'Sailesh Pathak', 'Vanraj Darbar', 'Surat HO'],
  Ludhiana: ['Ludhiana HO']
};

export const CATEGORIES = [
  'CKU', 
  'CRO', 
  'CUP', 
  'ELASTIC', 
  'EMBROIDARY', 
  'EYE_N_HOOK', 
  'PRINTING', 
  'TLU', 
  'VAU', 
  'WARP(UDHANA)'
].sort();

export const UOMS = ['INCH', 'KG', 'MTR', 'PCS', 'PKT', 'ROLL', 'YARD'];
