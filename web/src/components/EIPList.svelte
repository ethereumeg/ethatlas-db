<script>
    export let item;
    export let eips;
    export let type;

    function resolveEip(num) {
        return eips.find(e => e.eip === num)
    }

</script>

<h2 class="text-2xl">{type === 'eip' ? 'EIPs' : 'ERCs'}</h2>
<table class="table-auto">
    <thead>
        <tr><th>{type} Number</th><th>Name</th><th>Type</th><th>Category</th><th>Status</th></tr>
    </thead>
    <tbody>
        {#each item[type === 'eip' ? 'eips' : 'ercs'].map(resolveEip) as eip}
            <tr><td><a href="https://{type === 'eip' ? 'eips' : 'ercs'}.ethereum.org/{type === 'eip' ? 'EIPS' : 'ERCS'}/{type}-{eip.eip}" class="hover:underline">{eip.eip}</a></td><td>{eip.title}</td><td>{eip.type}</td><td>{eip.category}</td><td>{eip.status}</td></tr>
        {/each}
    </tbody>
</table>