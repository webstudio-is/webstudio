-- Create the "domainsVirtual" function to return all domain-related data for a specific project.
CREATE OR REPLACE FUNCTION "domainsVirtual"("Project")
RETURNS SETOF "domainsVirtual" AS $$
    -- This function retrieves all the domain information associated with a specific project by joining the Domain and ProjectDomain tables.
    -- It returns a result set conforming to the "domainsVirtual" structure, including fields such as domain status, error, verification status, etc.
    SELECT
        "Domain".id || '-' || "ProjectDomain"."projectId" as id,
        "Domain".id AS "domainId", -- Domain ID from Domain table
        "ProjectDomain"."projectId", -- Project ID from ProjectDomain table
        "Domain".domain, -- Domain name
        "Domain".status, -- Current domain status
        "Domain".error, -- Error message, if any
        "Domain"."txtRecord" AS "domainTxtRecord", -- Current TXT record from Domain table
        "ProjectDomain"."txtRecord" AS "expectedTxtRecord", -- Expected TXT record from ProjectDomain table
        "ProjectDomain"."cname" AS "cname",
        CASE
            WHEN "Domain"."txtRecord" = "ProjectDomain"."txtRecord" THEN true -- If TXT records match, domain is verified
            ELSE false
        END AS "verified", -- Boolean flag for verification status
        "ProjectDomain"."createdAt", -- Creation timestamp from ProjectDomain table
        "Domain"."updatedAt" -- Last updated timestamp from Domain table
    FROM
        "Domain"
    JOIN
        "ProjectDomain" ON "Domain".id = "ProjectDomain"."domainId" -- Joining Domain and ProjectDomain on domainId
    WHERE
        "ProjectDomain"."projectId" = $1.id -- Filtering by projectId passed as an argument to the function
    ORDER BY "ProjectDomain"."createdAt", "Domain".id; -- Stable sort
$$
STABLE
LANGUAGE sql;

-- Add function-specific comments to explain its behavior.
COMMENT ON FUNCTION "domainsVirtual"("Project") IS 'Function that retrieves domain-related data for a given project by joining the Domain and ProjectDomain tables. It returns a result set that conforms to the structure defined in the domainsVirtual virtual table.';
