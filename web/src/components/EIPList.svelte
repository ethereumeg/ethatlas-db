<script>
    export let item;
    export let eips;

    function resolveEip(num) {
        return eips.find(e => e.eip === num)
    }

</script>

<h2 class="text-2xl">EIPs</h2>
<table class="table-auto">
    <thead>
        <tr><th>EIP Number</th><th>Name</th><th>Type</th><th>Category</th><th>Status</th></tr>
    </thead>
    <tbody>
        {#each item.eips.map(resolveEip) as eip}
            <tr><td><a href="https://eips.ethereum.org/EIPS/eip-{eip.eip}" class="hover:underline">{eip.eip}</a></td><td>{eip.title}</td><td>{eip.type}</td><td>{eip.category}</td><td>{eip.status}</td></tr>
        {/each}
    </tbody>
</table>