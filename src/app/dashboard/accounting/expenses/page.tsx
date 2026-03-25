import { getExpenses } from "@/app/actions/expenses";
import { getClients } from "@/app/actions/clients";
import { ExpenseListView } from "./ExpenseListView";

export default async function ExpensesPage() {
    const [expensesRes, clientsRes] = await Promise.all([
        getExpenses(),
        getClients(),
    ]);

    return (
        <ExpenseListView
            initialExpenses={expensesRes.data || []}
            clients={(clientsRes.data || []) as any[]}
        />
    );
}
