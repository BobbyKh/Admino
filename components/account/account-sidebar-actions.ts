"use server";

import { logoutCustomer } from "@/lib/actions/customers";

export async function signOut() {
  await logoutCustomer();
}
