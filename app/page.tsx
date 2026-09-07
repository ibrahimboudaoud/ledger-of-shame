import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CreateCaseForm from "@/components/CreateCaseForm";
import styles from "./page.module.css";

export default async function Home() {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { people: true } } },
  });

  return (
    <div className="frame">
      <div className={`corkboard ${styles.board}`}>
        <h1 className={styles.title}>Ledger of Shame</h1>
        <p className={styles.subtitle}>who owes who, pinned up for all to see</p>

        <div className={styles.layout}>
          <CreateCaseForm />

          <div className={styles.caseList}>
            <h2 className="typewriter">Open cases</h2>
            {groups.length === 0 && (
              <p className={styles.empty}>No cases filed yet. Open one to the left.</p>
            )}
            <ul className={styles.cases}>
              {groups.map((group) => (
                <li key={group.id}>
                  <Link href={`/case/${group.id}`} className={styles.caseLink}>
                    <span className={styles.caseName}>{group.name}</span>
                    <span className={styles.caseMeta}>
                      {group._count.people} suspect{group._count.people === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
